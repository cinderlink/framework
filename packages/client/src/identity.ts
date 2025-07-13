import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import type {
  CinderlinkClientEvents,
  CinderlinkClientInterface,
  IdentityDocument,
  IdentityResolved,
  PluginEventDef,
} from "@cinderlink/core-types";
export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid: string | undefined = undefined;
  document: Record<string, unknown> | undefined = undefined;
  hasResolved = false;
  lastSavedAt = 0;
  resolving?: Promise<IdentityResolved>;
  saveDebounce?: NodeJS.Timeout;
  constructor(public client: CinderlinkClientInterface<PluginEvents>) {}

  resolve(): Promise<IdentityResolved> {
    if (this.resolving) return this.resolving;
    this.resolving = new Promise(async (resolve) => {
      this.client.logger.info("identity", "resolving local identity");
      const emptyResult: IdentityResolved = {
        cid: undefined,
        document: undefined,
      };

      const resolved = { ...emptyResult };
      const results = await Promise.all([
        this.resolveLocal().catch(() => emptyResult),
        this.resolveIPNS().catch(() => emptyResult),
        this.resolveServer().catch(() => emptyResult),
      ]);
      results.forEach((result) => {
        if (
          !Object.keys(resolved.document?.schemas || {}).length ||
          (result?.cid !== undefined &&
            result.document?.updatedAt &&
            Number(result.document.updatedAt || 0) >
              Number(resolved?.document?.updatedAt || 0))
        ) {
          resolved.cid = result.cid;
          resolved.document = result.document;
        }
      });
      this.cid = resolved?.cid;
      this.document = resolved?.document;

      this.client.logger.info("identity", "identity resolved", {
        cid: this.cid,
        document: this.document,
      });

      this.hasResolved = true;
      this.client.emit("/identity/resolved", {
        cid: this.cid,
        document: this.document,
      });
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
    const document = await this.client.dag
      .loadDecrypted<IdentityDocument>(CID.parse(cid), undefined, {
        timeout: 3000,
      })
      .catch(() => undefined);
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
      const ipns = this.client.ipfs.libp2p.services?.ipns as { resolve: (peerId: unknown) => Promise<string> } | undefined;
      if (ipns && typeof ipns.resolve === 'function') {
        const resolvedPath = await ipns.resolve(this.client.peerId);
        if (resolvedPath) {
          const cid = resolvedPath.split("/").pop();
          this.client.logger.info("IPNS", "resolve IPNS", { link: resolvedPath, cid });
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
      }
    } catch (__) {}

    return {
      cid: undefined,
      document: undefined,
    };
  }

  async resolveServer(): Promise<IdentityResolved> {
    const servers = this.client.peers.getServers();
    if (!servers.length) {
      this.client.logger.module("identity").warn("no servers found");
      return { cid: undefined, document: undefined };
    }

    const requestId = uuid();
    let cid: string | undefined = undefined;
    let document: IdentityDocument | undefined = undefined;

    for (const server of servers.filter((s) => !!s.peerId)) {
      const resolved = await this.client
        .request<CinderlinkClientEvents>(server.peerId.toString(), {
          topic: "/identity/resolve/request",
          payload: { requestId },
        })
        .then((result) => result?.payload as IdentityResolved | undefined)
        .catch(() => undefined);
      this.client.logger.info(
        "identity",
        `resolved server identity from ${server.peerId.toString()}`,
        {
          server: server.peerId.toString(),
          resolved,
        }
      );
      if (resolved?.cid) {
        const doc: IdentityDocument | undefined = await this.client.dag
          .loadDecrypted<IdentityDocument>(resolved.cid as string, undefined, {
            timeout: 5000,
          })
          .catch(() => undefined);
        if (
          doc &&
          (!document || Number(doc.updatedAt) >= Number(document.updatedAt))
        ) {
          cid = resolved.cid as string;
          document = doc;
        }
      }
    }

    this.client.logger.info("identity", "server identity resolved", {
      cid,
      document,
    });

    return { cid, document };
  }

  save({
    cid,
    document,
    forceRemote,
    forceImmediate,
  }: {
    cid: CID;
    document: Record<string, unknown>;
    forceRemote?: boolean;
    forceImmediate?: boolean;
  }) {
    if (!this.hasResolved || !cid) {
      this.client.logger.error("identity", "identity has not been resolved");
      return;
    }

    if (forceImmediate === true) {
      return this._save({ cid, document, forceRemote });
    }

    if (this.saveDebounce) {
      clearTimeout(this.saveDebounce);
    }

    this.saveDebounce = setTimeout(() => {
      this._save({ cid, document, forceRemote });
    }, 10000);
  }

  async _save({
    cid,
    document,
    forceRemote,
  }: {
    cid: CID;
    document: Record<string, unknown>;
    forceRemote?: boolean;
  }) {
    // unpin previous cid
    if (this.cid && this.cid !== cid.toString()) {
      this.client.logger.info("identity", "unpinning previous identity", {
        cid: this.cid,
      });
      try {
        for await (const _ of this.client.ipfs.pins.rm(CID.parse(this.cid))) {
          // consume generator
        }
      } catch {}
    }

    this.cid = cid.toString();
    this.document = document;
    this.client.logger.info("identity", "saving identity", {
      cid,
      document,
      servers: this.client.peers.getServers(),
    });

    await Promise.allSettled([
      localforage.setItem("rootCID", cid),
      // Pin with new API
      (async () => {
        try {
          for await (const _ of this.client.ipfs.pins.add(cid, { signal: AbortSignal.timeout(10000) })) {
            // consume generator
          }
        } catch {}
      })(),
      // Skip DHT provide as it may not be available
      // this.client.ipfs.dht.provide(cid, { recursive: true, timeout: 10000 }),
      // Skip IPNS publish for now as it requires more complex setup
      // this.client.ipfs.name.publish(cid, {
      //   timeout: 10000,
      //   allowOffline: true,
      //   lifetime: "14d",
      //   ttl: "1m",
      // }),
    ]);
    if (forceRemote || Date.now() - this.lastSavedAt > 10000) {
      this.lastSavedAt = Date.now();
      await Promise.all(
        this.client.peers.getServers().map(async (server) => {
          if (server.did) {
            this.client.logger.info("identity", "sending identity to server", {
              server,
            });

            await this.client.send<CinderlinkClientEvents>(
              server.peerId.toString(),
              {
                topic: "/identity/set/request",
                payload: { requestId: uuid(), cid: cid.toString() },
              }
            );
          } else {
            this.client.logger.warn("identity", "no did for server", {
              server,
            });
          }
        })
      );
    }

    // Skip garbage collection for now as repo API is not available in Helia
    // await this.client.ipfs.repo.gc();
  }
}
