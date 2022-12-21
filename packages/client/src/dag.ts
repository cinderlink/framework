import type { DAGInterface } from "@cryptids/dag-interface";
import { DIDDag } from "@cryptids/dag-interface";
import * as json from "multiformats/codecs/json";
import CryptidsClient from "./client";
import { CID } from "multiformats";

export class ClientDag implements DAGInterface {
  constructor(private client: CryptidsClient) {}

  async store<T>(
    data: T,
    inputCodec = "dag-json",
    hashAlg = "sha2-256"
  ): Promise<CID> {
    const encoded = json.encode(data);
    const cid = await this.client.ipfs.dag.put(encoded, {
      inputCodec,
      hashAlg,
      pin: true,
    });
    return cid;
  }

  async load<T>(cid: CID | string): Promise<T> {
    const stored = await this.client.ipfs.dag.get(
      typeof cid === "string" ? CID.parse(cid) : cid
    );
    return stored.value as T;
  }
}

export class ClientDIDDag extends DIDDag {
  constructor(client: CryptidsClient<any>) {
    super(client.did, new ClientDag(client));
  }
}
