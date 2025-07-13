import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import { DAGInterface, DIDDagInterface } from "@cinderlink/core-types";
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
  load<Data = unknown>(cid: CID, path?: string): Promise<Data> {
    if (!cid) return undefined as any;
    const cached = this.cache[cid.toString()] as Data;
    if (path) {
      return path
        .split("/")
        .reduce(
          (acc: any, key: string) => (key?.length ? acc[key] : acc),
          cached
        );
    }
    return cached;
  }
}

export class TestDIDDag implements DIDDagInterface {
  private dag: DAGInterface;
  constructor(public did: DID) {
    this.dag = new TestDag();
  }

  store<Data = unknown>(data: Data): Promise<CID | undefined> {
    return this.dag.store(data);
  }

  load<Data = unknown>(
    cid: CID,
    path?: string
  ): Promise<Data | undefined> {
    return this.dag.load<Data>(cid, path);
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

  loadEncrypted(cid: CID, path?: string): Promise<JWE | undefined> {
    return this.dag.load<JWE>(cid, path);
  }

  async loadDecrypted<Data = Record<string, unknown>>(
    cid: CID
  ): Promise<Data | undefined> {
    const jwe = await this.loadEncrypted(cid);
    if (!jwe) {
      throw new Error("Unable to load JWE");
    }
    const decrypted = await this.did.decryptDagJWE(jwe);
    return decrypted as Data;
  }
}
