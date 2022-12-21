import type { CID } from "multiformats";
import type { DID } from "dids";
import type { JWE } from "did-jwt";

export interface DAGInterface {
  store<Data = unknown>(
    data: Data,
    inputCodec?: string,
    hashAlg?: string
  ): Promise<CID | undefined>;
  load<Data = unknown>(cid: CID | string): Promise<Data>;
}

export interface DIDDagInterface extends DAGInterface {
  did: DID;
  storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients?: string[]
  ): Promise<CID | undefined>;
  loadEncrypted(cid: CID | string): Promise<JWE>;
  loadDecrypted<Data extends Record<string, unknown> = Record<string, unknown>>(
    cid: CID | string
  ): Promise<Data>;
}
