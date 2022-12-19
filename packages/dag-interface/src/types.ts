import type { CID } from "multiformats";
import type { DID } from "dids";
import type { JWE } from "did-jwt";

export interface DAGInterface {
  store<Data = unknown>(data: Data): Promise<CID | undefined>;
  load<Data = unknown>(cid: CID | string): Promise<Data>;
}

export interface DIDDagInterface extends DAGInterface {
  did: DID;
  storeEncrypted<Data = unknown>(
    data: Data,
    recipients?: string[]
  ): Promise<CID | undefined>;
  loadEncrypted(cid: CID | string): Promise<JWE>;
  loadDecrypted<Data = unknown>(cid: CID | string): Promise<Data>;
}
