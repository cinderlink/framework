import type { CID } from "multiformats";
import type { DID } from "dids";
import type { JWE } from "did-jwt";

export interface DAGInterface {
  store<Data = unknown>(
    data: Data,
    inputCodec?: string,
    hashAlg?: string
  ): Promise<CID | undefined>;
  load<Data = unknown>(
    cid: CID | string,
    path?: string
  ): Promise<Data | undefined>;
}

export interface DIDDagInterface extends DAGInterface {
  did: DID;
  storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients?: string[]
  ): Promise<CID | undefined>;
  loadEncrypted(cid: CID | string, path?: string): Promise<JWE | undefined>;
  loadDecrypted<Data extends Record<string, unknown> = Record<string, unknown>>(
    cid: CID | string,
    path?: string
  ): Promise<Data | undefined>;
}

export interface DagKeyval {
  id: string;
  dag: DAGInterface;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  save(): Promise<CID>;
  load(cid: CID, path?: string): Promise<void>;
}
