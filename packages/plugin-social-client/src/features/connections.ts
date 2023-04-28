import {
  SocialClientEvents,
  SocialConnection,
  SocialConnectionFilter,
} from "@cinderlink/plugin-social-core";
import SocialClientPlugin from "../plugin";
import { IncomingPubsubMessage } from "@cinderlink/core-types";

const logModule = "plugins";
const pluginName = "social-client";

export class SocialConnections {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async createConnection(to: string) {
    const connection = {
      from: this.plugin.client.id,
      to,
      follow: true,
    };
    const stored = await this.plugin
      .table<SocialConnection>("connections")
      .upsert({ from: connection.from, to: connection.to }, connection);
    if (!stored) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/createConnection: failed to create connection`,
        {
          from: this.plugin.client.id,
          to,
        }
      );

      return;
    }

    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/createConnection: connection created`,
      {
        from: this.plugin.client.id,
        to,
      }
    );
    await this.sendConnection(stored);
  }

  async onCreate(
    message: IncomingPubsubMessage<
      SocialClientEvents,
      "/social/connections/create"
    >
  ) {
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/onCreate: connection received`,
      { message }
    );
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

    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/deleteConnection: deleting connection`,
      { from: this.plugin.client.id, to, connection }
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
      this.plugin.client.logger.error(
        logModule,
        `${pluginName}/deleteConnection: failed to delete connection`,
        { from: this.plugin.client.id, to }
      );

      return;
    }

    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/deleteConnection: connection deleted`,
      { from: this.plugin.client.id, to }
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

    if (filter === "in") {
      query.where("to", "=", user);
    } else if (filter === "out") {
      query.where("from", "=", user);
    } else if (filter === "all" || filter === "mutual") {
      query.or((qb) => {
        qb.select().where("to", "=", user);
      });
      query.or((qb) => {
        qb.select().where("from", "=", user);
      });
    }
    // } else if (filter === "mutual") {
    //   query.where("to", "=", user).whereFn((row) => {
    //     return this.connectionExists(row.from, user);
    //   })
    // }

    const results = (await query.execute()).all();

    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/getConnections: get connections`,
      { filter, results }
    );
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

  async hasConnectionWith(user: string): Promise<boolean> {
    return (
      (await this.hasConnectionFrom(user)) || (await this.hasConnectionTo(user))
    );
  }
}
