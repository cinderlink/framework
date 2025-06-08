declare module 'blockstore-fs' {
  import { Blockstore } from 'interface-blockstore';
  import { CID } from 'multiformats/cid';
  import { AbortOptions } from 'interface-store';

  export interface FsBlockstoreInit {
    path?: string;
    createIfMissing?: boolean;
    errorIfExists?: boolean;
    extension?: string;
    prefix?: string;
    hashAlg?: string;
  }

  export class FsBlockstore extends Blockstore {
    constructor(path?: string, init?: FsBlockstoreInit);
    open(): Promise<void>;
    close(): Promise<void>;
    destroy(): Promise<void>;
    has(cid: CID, options?: AbortOptions): Promise<boolean>;
    get(cid: CID, options?: AbortOptions): Promise<Uint8Array>;
    put(cid: CID, buf: Uint8Array, options?: AbortOptions): Promise<CID>;
    delete(cid: CID, options?: AbortOptions): Promise<void>;
    query(q: any, options?: AbortOptions): AsyncIterable<{ key: CID; value: Uint8Array }>;
  }

  export default FsBlockstore;
}
