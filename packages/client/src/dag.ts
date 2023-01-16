import type { DAGInterface } from "@candor/core-types";
import { DIDDag } from "./did/dag";
import * as json from "multiformats/codecs/json";
import CandorClient from "./client";
import { CID } from "multiformats";

export class ClientDag implements DAGInterface {
  constructor(private client: CandorClient) {}

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
  constructor(client: CandorClient<any>) {
    super(client.did, new ClientDag(client));
  }
}
