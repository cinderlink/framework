import { v4 as uuid } from "uuid";
import localforage from "localforage";
import { CID } from "multiformats";
import { CryptidsClient, PubsubMessage } from "./client";

export type IdentityResolveResponse = {
  requestID: string;
  cid?: string;
  doc?: Record<string, unknown>;
};

export class Identity {
  cid?: string;
  document?: any;
  constructor(public client: CryptidsClient<any>) {}

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
    const cid = await localforage.getItem<string>("rootCID");
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

    for await (const cid of this.client.ipfs.name.resolve(this.client.peerId)) {
      const document = await this.client.dag.loadDecrypted<
        { updatedAt: number } & Record<string, unknown>
      >(CID.parse(cid));
      return { cid, document };
    }

    return {
      cid: undefined,
      document: undefined,
    };
  }

  async resolveServer(timeout = 5000) {
    const cid: string | undefined = await new Promise((resolve) => {
      let requestID = uuid();
      let _timeout = setTimeout(() => {
        resolve(undefined);
      }, timeout);
      this.client.p2p.on(
        "/identity/resolve/response",
        (message: PubsubMessage<IdentityResolveResponse>) => {
          if (message.data.requestID === requestID) {
            clearTimeout(_timeout);
            resolve(message.data.cid as string);
          }
        }
      );
      this.client.send("/identity/resolve/request", {
        requestID,
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
    await localforage.setItem("rootCID", cid);
    await this.client.ipfs.name.publish(cid);
    await Promise.all(
      this.client.peers.getServers().map(async (server) => {
        await this.client.send(server.did, {
          topic: "/identity/set/request",
          requestID: uuid(),
          cid,
        });
      })
    );
  }
}
