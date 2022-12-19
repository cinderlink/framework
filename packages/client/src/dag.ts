import type { DAGInterface } from "@cryptids/dag-interface";
import { DIDDag } from "@cryptids/dag-interface";
import CryptidsClient from "client";
import { CID } from "multiformats";

export class ClientDag implements DAGInterface {
  constructor(private client: CryptidsClient) {}

  async store<T>(data: T): Promise<CID> {
    const cid = await this.client.ipfs.dag.put(data, {
      inputCodec: "dag-cbor",
      hashAlg: "sha2-256",
    });
    return cid;
  }

  async load<T>(cid: CID): Promise<T> {
    const result = await this.client.ipfs.dag.get(cid);
    return result as T;
  }
}

export class ClientDIDDag extends DIDDag {
  constructor(client: CryptidsClient<any>) {
    super(client.did, new ClientDag(client));
  }
}
