import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import type {
  CinderlinkClientEvents,
  CinderlinkClientInterface,
  IdentityResolved,
  PluginEventDef,
} from "@cinderlink/core-types";
export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid: string | undefined = undefined;
  document: Record<string, unknown> | undefined = undefined;
  constructor(public client: CinderlinkClientInterface<PluginEvents>) {}

  async resolve(): Promise<IdentityResolved> {
    console.info(`client/identity/resolve > resolving local identity`);
    const emptyResult = {
      cid: undefined,
      document: undefined,
    };
    let resolved = await this.resolveLocal().catch(() => emptyResult);
    console.info(`client/identity/resolve > resolving ipns identity`);
    const ipns = await this.resolveIPNS().catch(() => emptyResult);
    if (
      !resolved?.document?.updatedAt ||
      (ipns?.cid &&
        (ipns.document?.updatedAt ?? 0) > resolved?.document?.updatedAt)
    ) {
      resolved = ipns;
    }
    console.info(`client/identity/resolve > resolving server identity`);
    const server = await this.resolveServer().catch(() => emptyResult);
    if (
      server?.cid !== undefined &&
      server.document?.updatedAt &&
      server.document.updatedAt > (resolved?.document?.updatedAt || 0)
    ) {
      resolved = server as IdentityResolved;
    }
    this.cid = resolved?.cid;
    this.document = resolved?.document;
    console.info(`client/identity/resolve > identity resolved`, {
      cid: this.cid,
      document: this.document,
    });
    return resolved;
  }

  async resolveLocal(): Promise<IdentityResolved> {
    const cid = await localforage
      .getItem<string>("rootCID")
      .catch(() => undefined);
    if (!cid) {
      return { cid: undefined, document: undefined };
    }
    const document = await this.client.dag.loadDecrypted<
      { updatedAt: number } & Record<string, unknown>
    >(CID.parse(cid), undefined, { timeout: 1000 });
    return { cid, document };
  }

  async resolveIPNS(): Promise<IdentityResolved> {
    if (!this.client.peerId) {
      return {
        cid: undefined,
        document: undefined,
      };
    }

    try {
      for await (const link of this.client.ipfs.name.resolve(
        this.client.peerId,
        { recursive: true, timeout: 1000 }
      )) {
        const cid = link.split("/").pop();
        console.info("IPNS resolve", { link, cid });
        if (cid) {
          const document = await this.client.dag
            .loadDecrypted<{ updatedAt: number } & Record<string, unknown>>(
              CID.parse(cid),
              undefined,
              { timeout: 3000 }
            )
            .catch(() => undefined);
          if (document) {
            return { cid, document };
          }
        }
      }
    } catch (err) {
      console.warn("IPNS resolve failed", err);
    }

    return {
      cid: undefined,
      document: undefined,
    };
  }

  async resolveServer(): Promise<IdentityResolved> {
    const servers = this.client.peers.getServers();
    if (!servers.length) {
      return { cid: undefined, document: undefined };
    }

    let requestId = uuid();
    let cid: string | undefined = undefined;

    for (const server of servers.filter((s) => !!s.peerId)) {
      const resolved = await this.client.request<CinderlinkClientEvents>(
        server.peerId.toString(),
        {
          topic: "/identity/resolve/request",
          payload: { requestId },
        }
      );
      console.info("server identity resolved", resolved);
    }

    const document = cid
      ? await this.client.dag
          .loadDecrypted<{ updatedAt: number } & Record<string, unknown>>(
            CID.parse(cid)
          )
          .catch(() => undefined)
      : undefined;
    return { cid, document };
  }

  async save({
    cid,
    document,
  }: {
    cid: string;
    document: Record<string, unknown>;
  }) {
    this.cid = cid;
    this.document = document;
    console.info(`client/identity/save`, { cid, document });
    await localforage.setItem("rootCID", cid).catch(() => {});
    await this.client.ipfs.name.publish(cid, { timeout: 1000 }).catch(() => {});
    await this.client.ipfs.pin.add(cid).catch(() => {});
    await Promise.all(
      this.client.peers.getServers().map(async (server) => {
        if (server.did) {
          await this.client.send<CinderlinkClientEvents>(
            server.peerId.toString(),
            {
              topic: "/identity/set/request",
              payload: { requestId: uuid(), cid },
            }
          );
        }
      })
    );
  }
}
