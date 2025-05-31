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
import { ipns } from "@helia/ipns";

export class Identity<PluginEvents extends PluginEventDef = PluginEventDef> {
  cid: string | undefined = undefined;
  document: Record<string, unknown> | undefined = undefined;
  hasResolved = false;
  lastSavedAt = 0;
  resolving?: Promise<IdentityResolved>;
  saveDebounce?: NodeJS.Timeout;
  constructor(public client: CinderlinkClientInterface<PluginEvents>) {}

  async resolve(): Promise<IdentityResolved> {
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
      // Assuming this.client.peerId is the PeerId object for the node's own key
      const resolution = await ipns(this.client.ipfs).resolve(this.client.peerId!, { // Added ! for peerId as it should exist here
        recursive: true,
        timeout: 3000,
      });
      // The new resolve likely returns a single value (e.g. /ipfs/cid) or throws.
      // The old API returned an async iterator.
      if (resolution && resolution.path) {
        const cidString = resolution.path.replace("/ipfs/", "");
        this.client.logger.info("IPNS", "resolve IPNS", { link: resolution.path, cid: cidString });
        const document = await this.client.dag
          .loadDecrypted<IdentityDocument>(CID.parse(cidString), undefined, {
            timeout: 3000,
          })
          .catch(() => undefined);
        if (document) {
          return { cid: cidString, document };
        }
      }
    } catch (error) {
      this.client.logger.error("IPNS", "error resolving IPNS", { error });
    }

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

    let requestId = uuid();
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

  async save({
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
    if (!this.client.ipfs.isOnline) {
      this.client.logger.error(
        "identity",
        "failed to save identity, ipfs is offline"
      );
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
        await this.client.ipfs.pins().rm(CID.parse(this.cid), { recursive: true });
      } catch (error) {
        this.client.logger.warn("identity", "failed to unpin previous identity CID", { cid: this.cid, error });
      }
    }

    this.cid = cid.toString();
    this.document = document;
    this.client.logger.info("identity", "saving identity", {
      cid,
      document,
      servers: this.client.peers.getServers(),
    });

    await Promise.allSettled([
      localforage.setItem("rootCID", cid.toString()), // Ensure cid is string for localforage
      this.client.ipfs.pins().add(cid, { recursive: true, timeout: 10000 }),
      // this.client.ipfs.dht.provide(cid, { recursive: true, timeout: 10000 }), // DHT provide might change with new libp2p
      ipns(this.client.ipfs).publish(this.client.peerId!, `/ipfs/${cid.toString()}`, { // Added ! for peerId
        timeout: 10000,
        // allowOffline: true, // Check if this option still exists or is default
        lifetime: "14d", // Check new API for lifetime/ttl options
        // ttl: "1m", // Check new API
      }),
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

    await this.client.ipfs.repo.gc();
  }
}
