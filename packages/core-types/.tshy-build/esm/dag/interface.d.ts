import type { CID } from "multiformats";
import type { DID } from "dids";
import type { JWE } from "did-jwt";
import { DAGStoreOptions } from "./types";
export interface GetOptions {
    timeout?: number;
    signal?: AbortSignal;
    path?: string;
}
export interface DAGInterface {
    store<Data = unknown>(data: Data, options?: DAGStoreOptions): Promise<CID | undefined>;
    load<Data = unknown>(cid: CID | string, path?: string, options?: GetOptions): Promise<Data | undefined>;
}
export interface DIDDagInterface extends DAGInterface {
    did: DID;
    storeEncrypted<Data extends Record<string, unknown> = Record<string, unknown>>(data: Data, recipients?: string[], options?: DAGStoreOptions): Promise<CID | undefined>;
    loadEncrypted(cid: CID | string, path?: string, options?: GetOptions): Promise<JWE | undefined>;
    loadDecrypted<Data = Record<string, unknown>>(cid: CID | string, path?: string, options?: GetOptions): Promise<Data | undefined>;
}
export interface DagKeyval {
    id: string;
    dag: DAGInterface;
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    save(): Promise<CID>;
    load(cid: CID, path?: string, options?: GetOptions): Promise<void>;
}
