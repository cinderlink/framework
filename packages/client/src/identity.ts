import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import toBuffer from "it-to-buffer";
import type {
  CinderlinkClientEvents,
  CinderlinkClientInterface,
  IdentityDocument,
  IdentityResolved,
  PluginEventDef,
} from "@cinderlink/core-types";
import { base58btc } from "multiformats/bases/base58";
export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid: string | undefined = undefined;
  document: Record<string, unknown> | undefined = undefined;
  hasResolved = false;
  lastSavedAt = 0;
  resolving?: Promise<IdentityResolved>;
  constructor(public client: CinderlinkClientInterface<PluginEvents>) {}

  async resolve(): Promise<IdentityResolved> {
    if (this.resolving) return this.resolving;
    this.resolving = new Promise(async (resolve) => {
      console.info(`client/identity/resolve > resolving local identity`);
      const emptyResult: IdentityResolved = {
        cid: undefined,
        document: undefined,
      };
      let resolved = await this.resolveLocal().catch(() => emptyResult);
      console.info(`client/identity/resolve > resolving ipns identity`);
      const ipns = await this.resolveIPNS().catch(() => emptyResult);
      if (
        !Object.keys(resolved.document?.schemas || {}).length ||
        (ipns && !resolved?.document?.updatedAt) ||
        (ipns.cid &&
          Number(ipns.document?.updatedAt || 0) >
            Number(resolved?.document?.updatedAt || 0))
      ) {
        resolved = ipns;
      }
      console.info(`client/identity/resolve > resolving server identity`);
      const server = await this.resolveServer().catch(() => emptyResult);
      if (
        !Object.keys(resolved.document?.schemas || {}).length ||
        (server?.cid !== undefined &&
          server.document?.updatedAt &&
          Number(server.document.updatedAt || 0) >=
            Number(resolved?.document?.updatedAt || 0))
      ) {
        resolved = server as IdentityResolved;
      }
      this.cid = resolved?.cid;
      this.document = resolved?.document;

      console.info(`client/identity/resolve > identity resolved`, {
        cid: this.cid,
        document: this.document,
      });
      this.client.emit("/identity/resolved", {
        cid: this.cid,
        document: this.document,
      });
      this.hasResolved = true;
      resolve(resolved);
    });
    return this.resolving.then((result) => {
      this.resolving = undefined;
      return result;
    });
  }

  async resolveLocal(): Promise<IdentityResolved> {
    const cid = await localforage
      .getItem<string>("rootCID")
      .catch(() => undefined);
    if (!cid) {
      return { cid: undefined, document: undefined };
    }
    const document = await this.client.dag.loadDecrypted<IdentityDocument>(
      CID.parse(cid),
      undefined,
      { timeout: 3000 }
    );
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
        { recursive: true, timeout: 3000 }
      )) {
        const cid = link.split("/").pop();
        console.info("IPNS resolve", { link, cid });
        if (cid) {
          const document = await this.client.dag
            .loadDecrypted<IdentityDocument>(CID.parse(cid), undefined, {
              timeout: 3000,
            })
            .catch(() => undefined);
          if (document) {
            return { cid, document };
          }
        }
      }
    } catch (_) {}

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
    let document: IdentityDocument | undefined = undefined;

    for (const server of servers.filter((s) => !!s.peerId)) {
      const resolved = await this.client.request<CinderlinkClientEvents>(
        server.peerId.toString(),
        {
          topic: "/identity/resolve/request",
          payload: { requestId },
        }
      );
      if (resolved?.payload.cid) {
        const doc: IdentityDocument | undefined = await this.client.dag
          .loadDecrypted<IdentityDocument>(
            resolved.payload.cid as string,
            undefined,
            {
              timeout: 5000,
            }
          )
          .catch(() => undefined);
        if (
          doc &&
          (!document || Number(doc.updatedAt) >= Number(document.updatedAt))
        ) {
          cid = resolved.payload.cid as string;
          document = doc;
        }
      }
    }

    console.info(`client/identity/resolve > server identity resolved`, {
      cid,
      document,
    });
    return { cid, document };
  }

  async save({
    cid,
    document,
    forceRemote,
  }: {
    cid: string;
    document: Record<string, unknown>;
    forceRemote?: boolean;
  }) {
    if (!this.hasResolved || !cid) {
      console.warn(`client/identity/save > identity has not been resolved`);
      return;
    }
    this.cid = cid;
    this.document = document;
    console.info(`client/identity/save`, {
      cid,
      document,
      servers: this.client.peers.getServers(),
    });
    await localforage.setItem("rootCID", cid).catch(() => {});
    await this.client.ipfs.pin.add(cid, { recursive: true });
    await this.client.ipfs.name
      .publish(cid, { timeout: 1000, allowOffline: true })
      .catch(() => {});
    if (forceRemote || Date.now() - this.lastSavedAt > 30000) {
      this.lastSavedAt = Date.now();
      const buffer = await toBuffer(
        this.client.ipfs.dag.export(CID.parse(cid))
      );
      const bufferStr = base58btc.encode(buffer);
      await Promise.all(
        this.client.peers.getServers().map(async (server) => {
          if (server.did) {
            console.info(`client/identity/save > sending identity to server`, {
              server,
            });
            await this.client.send<CinderlinkClientEvents>(
              server.peerId.toString(),
              {
                topic: "/identity/set/request",
                payload: { requestId: uuid(), cid, buffer: bufferStr },
              }
            );
          } else {
            console.info(`client/identity/save > no did for server`, {
              server,
            });
          }
        })
      );
    }
  }
}
