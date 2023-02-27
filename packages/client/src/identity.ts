import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import type {
  CandorClientEvents,
  CandorClientInterface,
  PluginEventDef,
} from "@candor/core-types";
export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid?: string;
  document?: Record<string, unknown>;
  constructor(public client: CandorClientInterface<PluginEvents>) {}

  async resolve() {
    let resolved = await this.resolveLocal();
    const ipns = await this.resolveIPNS();
    if (
      !resolved?.document?.updatedAt ||
      (ipns?.cid && ipns.document?.updatedAt > resolved?.document?.updatedAt)
    ) {
      resolved = ipns;
    }
    const server = await this.resolveServer();
    if (
      server.cid !== undefined &&
      server.document?.updatedAt &&
      server.document.updatedAt > (resolved?.document?.updatedAt || 0)
    ) {
      resolved = server as { cid: string; document: any };
    }
    this.cid = resolved?.cid;
    this.document = resolved?.document;
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
    >(CID.parse(cid));
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
          const document = await this.client.dag.loadDecrypted<
            { updatedAt: number } & Record<string, unknown>
          >(CID.parse(cid), undefined, { timeout: 3000 });
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

  async resolveServer(timeout = 5000) {
    const cid: string | undefined = await new Promise((resolve) => {
      let requestId = uuid();
      let _timeout = setTimeout(() => {
        resolve(undefined);
      }, timeout);
      this.client.p2p.on("/identity/resolve/response", (message) => {
        if (message.payload.requestId === requestId) {
          clearTimeout(_timeout);
          resolve(message.payload.cid as string);
        }
      });
      const servers = this.client.peers.getServers();
      if (!servers.length) {
        clearTimeout(_timeout);
        resolve(undefined);
        return;
      }
      servers.forEach((server) => {
        if (server.peerId) {
          this.client.send<CandorClientEvents>(server.peerId.toString(), {
            topic: "/identity/resolve/request",
            payload: { requestId },
          });
        }
      });
    });
    const document = cid
      ? await this.client.dag.loadDecrypted<
          { updatedAt: number } & Record<string, unknown>
        >(CID.parse(cid))
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
