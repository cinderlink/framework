import {
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
} from "@candor/core-types";
import {
  SocialClientEvents,
  SocialConnection,
  SocialConnectionFilter,
  SocialUser,
} from "@candor/plugin-social-core";
import SocialClientPlugin from "../plugin";

const logPrefix = `plugin/social/client`;

export class SocialConnections {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async createConnection(to: string) {
    const connection = {
      from: this.plugin.client.id,
      to,
      follow: true,
    };
    const cid = await this.plugin.client.dag.store(connection);
    const stored = await this.plugin
      .table<SocialConnection>("connections")
      .upsert({ cid: cid?.toString() }, connection);
    if (!stored) {
      console.warn(
        `${logPrefix} > failed to create connection (from: ${this.plugin.client}, to: ${to})`
      );
      return;
    }
    console.info(
      `${logPrefix} > created connection (from: ${this.plugin.client}, to: ${to})`,
      connection
    );
    await this.sendConnection(stored);
  }

  async sendConnection(connection: SocialConnection) {
    await this.plugin.client.publish("/social/connections/create", connection, {
      sign: true,
      encrypt: false,
    });
  }

  async deleteConnection(from: string, to: string) {
    const connections = await this.plugin.table<SocialConnection>(
      "connections"
    );
    const connection = await connections
      .query()
      .where("from", "=", from)
      .where("to", "=", to)
      .select()
      .execute()
      .then((result) => result.first());
    console.info(
      `${logPrefix} > deleting connection (from: ${this.plugin.client}, to: ${to})`,
      connection
    );
    const deleted = await connections
      .query()
      .where("from", "=", from)
      .where("to", "=", to)
      .delete()
      .returning()
      .execute()
      .then((result) => result.first());
    if (!deleted) {
      console.warn(
        `${logPrefix} > failed to delete connection (from: ${this.plugin.client}, to: ${to})`
      );
      return;
    }
    console.info(
      `${logPrefix} > deleted connection (from: ${this.plugin.client}, to: ${to})`
    );
    await this.sendConnection({ ...connection, follow: false });
  }

  async getConnections(
    user: string,
    filter: SocialConnectionFilter,
    limit: number = 100
  ): Promise<SocialConnection[]> {
    const query = this.plugin
      .table<SocialConnection>("connections")
      .query()
      .limit(limit)
      .select();

    if (filter === "in" || filter === "mutual") {
      query.where("to", "=", user);
    } else if (filter === "out") {
      query.where("from", "=", user);
    }

    if (filter === "mutual") {
      query.or((qb) => {
        qb.select().where("from", "=", user);
      });
    }

    const results = (await query.execute()).all();

    console.info(`${logPrefix} > getConnections`, { filter, results });
    if (filter === "mutual") {
      return results
        .filter((row) => row.to === user)
        .filter((result) => {
          return results
            .filter((row) => row.from === user)
            .some((other) => {
              return other.from === result.to && other.to === result.from;
            });
        });
    }

    return results;
  }

  async getConnectionDirection(
    to: string,
    from: string = this.plugin.client.id
  ) {
    const connections = await this.plugin.table<SocialConnection>(
      "connections"
    );
    const outgoing = await connections
      .query()
      .where("to", "=", to)
      .where("from", "=", from)
      .select()
      .execute()
      .then((result) => result.all());
    const incoming = await connections
      .query()
      .where("from", "=", to)
      .where("to", "=", from)
      .select()
      .execute()
      .then((result) => result.all());

    if (incoming.length > 0 && outgoing.length > 0) {
      return "mutual";
    }

    if (incoming.length > 0) {
      return "in";
    }

    if (outgoing.length > 0) {
      return "out";
    }

    return "none";
  }

  async getConnectionsCount(user: string, filter: SocialConnectionFilter) {
    const connections = await this.plugin.table<SocialConnection>(
      "connections"
    );
    if (filter === "all") {
      return connections
        .query()
        .where("from", "=", user)
        .or((qb) => qb.where("to", "=", user))
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "in") {
      return connections
        .query()
        .where("to", "=", user)
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "out") {
      return connections
        .query()
        .where("from", "=", user)
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "mutual") {
      return connections
        .query()
        .where("from", "=", user)
        .and((qb) => qb.where("to", "=", user))
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    throw new Error("Invalid filter");
  }

  async hasConnectionTo(user: string): Promise<boolean> {
    const connections = await this.plugin
      .table<SocialConnection>("connections")
      .query()
      .where("to", "=", user)
      .where("from", "=", this.plugin.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    return connections.length > 0;
  }

  async hasConnectionFrom(user: string): Promise<boolean> {
    const connections = await this.plugin
      .table<SocialConnection>("connections")
      .query()
      .where("from", "=", user)
      .where("to", "=", this.plugin.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    return connections.length > 0;
  }

  async hasMutualConnectionTo(user: string): Promise<boolean> {
    return (
      (await this.hasConnectionFrom(user)) && (await this.hasConnectionTo(user))
    );
  }

  async hasAnyConnectionTo(user: string): Promise<boolean> {
    return (
      (await this.hasConnectionFrom(user)) || (await this.hasConnectionTo(user))
    );
  }

  async onCreate(
    message:
      | IncomingP2PMessage<
          SocialClientEvents,
          "/social/connections/create",
          EncodingOptions
        >
      | IncomingPubsubMessage<SocialClientEvents, "/social/connections/create">
  ) {
    if (!message.peer?.did) {
      console.warn(
        `${logPrefix} > failed to create connection from unknown peer`,
        message
      );
      return;
    }

    if (message.payload.from !== message.peer.did) {
      console.warn(
        `${logPrefix} > refusing to create connection for another user`,
        {
          from: message.payload.from,
          did: message.peer.did,
        }
      );
      return;
    }

    const users = this.plugin.table<SocialUser>("users");

    let fromUserId = (await this.plugin.users.getUserByDID(message.peer.did))
      ?.id;
    if (!fromUserId) {
      // we don't have the user, so we need to fetch it
      const { id, ...user } = await this.plugin.users.getUserFromServer(
        message.peer.did
      );
      if (user) {
        const fromUser = await users.upsert({ did: message.peer.did }, user);
        fromUserId = fromUser?.id;
      }
    }

    let toUserId = (await this.plugin.users.getUserByDID(message.payload.to))
      ?.id;
    if (!toUserId) {
      // we don't have the user, so we need to fetch it
      const user = await this.plugin.users.getUserFromServer(
        message.payload.to
      );
      if (user) {
        const toUser = await users.upsert({ did: message.payload.to }, user);
        toUserId = toUser?.id;
      }
    }

    if (!fromUserId || !toUserId) {
      console.warn(`${logPrefix} > failed to create connection, missing user`, {
        fromUserId,
        toUserId,
      });
      return;
    }

    const connectionsTable = await this.plugin.table<SocialConnection>(
      "connections"
    );

    const connection = await connectionsTable
      ?.query()
      .where("from", "=", message.payload.from)
      .where("to", "=", message.payload.to)
      .select()
      .execute()
      .then((result) => result.first() as SocialConnection | undefined);
    if (connection?.id) {
      await connectionsTable?.update(connection.id, {
        follow: message.payload.follow,
      });
    } else {
      await connectionsTable?.insert({
        from: message.payload.from,
        to: message.payload.to,
        follow: !!message.payload.follow,
      });
    }
  }

  async onConfirm(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/connections/confirm",
      EncodingOptions
    >
  ) {
    const { cid } = message.payload;
    const connection = await this.plugin
      .table<SocialConnection>("connections")
      .query()
      .where("cid", "=", cid)
      .select()
      .execute()
      .then((result) => result.first());
    if (!connection) {
      console.warn(`${logPrefix} > failed to confirm connection, missing cid`, {
        cid,
      });
      return;
    }

    await this.plugin
      .table<SocialConnection>("connections")
      .update(connection.id, {
        confirmations: (connection.confirmations || 0) + 1,
      });
  }
}
