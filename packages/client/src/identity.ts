import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import type {
  CandorClientEvents,
  CandorClientInterface,
  PluginEventDef,
} from "@candor/core-types";
export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid: string | undefined = undefined;
  document: Record<string, unknown> | undefined = undefined;
  constructor(public client: CandorClientInterface<PluginEvents>) {}

  async resolve() {
    console.info(`client/identity/resolve > resolving local identity`);
    let resolved = await this.resolveLocal().catch(() => undefined);
    console.info(`client/identity/resolve > resolving ipns identity`);
    const ipns = await this.resolveIPNS().catch(() => undefined);
    if (
      !resolved?.document?.updatedAt ||
      (ipns?.cid && ipns.document?.updatedAt > resolved?.document?.updatedAt)
    ) {
      resolved = ipns;
    }
    console.info(`client/identity/resolve > resolving server identity`);
    const server = await this.resolveServer().catch(() => undefined);
    if (
      server?.cid !== undefined &&
      server.document?.updatedAt &&
      server.document.updatedAt > (resolved?.document?.updatedAt || 0)
    ) {
      resolved = server as { cid: string | undefined; document: any };
    }
    this.cid = resolved?.cid;
    this.document = resolved?.document;
    console.info(`client/identity/resolve > identity resolved`, {
      cid: this.cid,
      document: this.document,
    });
    return resolved;
  }

  async resolveLocal() {
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

  async resolveIPNS() {
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

  async resolveServer() {
    const servers = this.client.peers.getServers();
    if (!servers.length) {
      return { cid: undefined, document: undefined };
    }

    let requestId = uuid();
    let cid: string | undefined = undefined;

    for (const server of servers.filter((s) => !!s.peerId)) {
      const resolved = await this.client.request<CandorClientEvents>(
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

  async save({ cid, document }: { cid: string; document: any }) {
    this.cid = cid;
    this.document = document;
    console.info(`client/identity/save`, { cid, document });
    await localforage.setItem("rootCID", cid).catch(() => {});
    await this.client.ipfs.name.publish(cid, { timeout: 1000 }).catch(() => {});
    await this.client.ipfs.pin.add(cid).catch(() => {});
    await Promise.all(
      this.client.peers.getServers().map(async (server) => {
        if (server.did) {
          await this.client.send<CandorClientEvents>(server.peerId.toString(), {
            topic: "/identity/set/request",
            payload: { requestId: uuid(), cid },
          });
        }
      })
    );
  }
}
