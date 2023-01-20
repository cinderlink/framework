import { CID } from "multiformats";
import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import type { DAGInterface } from "@candor/core-types/src/dag/interface";
import type { DID } from "dids";
import type { JWE } from "did-jwt";

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

export class TestDIDDag {
  private dag: DAGInterface;
  constructor(public did: DID) {
    this.dag = new TestDag();
  }

  async store<Data = unknown>(data: Data): Promise<CID | undefined> {
    return this.dag.store(data);
  }

  async load<Data = unknown>(cid: CID): Promise<Data> {
    return this.dag.load<Data>(cid);
  }

  async storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients: string[] = [this.did.id]
  ): Promise<CID | undefined> {
    const jwe = await this.did.createDagJWE(data, recipients);
    return this.dag.store(jwe);
  }

  async loadEncrypted(cid: CID): Promise<JWE> {
    return this.dag.load<JWE>(cid);
  }

  async loadDecrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(cid: CID): Promise<Data> {
    const jwe = await this.loadEncrypted(cid);
    const decrypted = await this.did.decryptDagJWE(jwe);
    return decrypted as Data;
  }
}
