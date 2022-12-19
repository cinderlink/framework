import { CID } from "multiformats";
import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import { DAGInterface } from "./types";
import { DIDDag } from "./did-dag";
import { DID } from "dids";

export class TestDag implements DAGInterface {
  cache: Record<string, unknown> = {};
  async store<Data = unknown>(data: Data): Promise<CID | undefined> {
    const cid = CID.create(
      1,
      json.code,
      await sha256.digest(json.encode(data))
    );
    if (!cid) return undefined;
    this.cache[cid.toString()] = data;
    return cid;
  }
  async load<Data = unknown>(cid: CID): Promise<Data> {
    if (!cid) return undefined as any;
    return this.cache[cid.toString()] as Data;
  }
}

export class TestDIDDag extends DIDDag {
  constructor(did: DID) {
    super(did, new TestDag());
  }
}
