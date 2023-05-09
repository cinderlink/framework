import type {
  CinderlinkClientInterface,
  DAGInterface,
  DAGStoreOptions,
  PluginEventDef,
} from "@cinderlink/core-types";
import { DIDDag } from "./did/dag";
import { CID } from "multiformats";
import { GetOptions } from "ipfs-core-types/src/root";
import { removeUndefined } from "./did/util";

export class ClientDag<Plugins extends PluginEventDef = PluginEventDef>
  implements DAGInterface
{
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async store<T>(data: T, options?: DAGStoreOptions): Promise<CID> {
    // if data is an object
    const cid = await this.client.ipfs.dag.put(
      removeUndefined(data as Record<string, unknown>),
      {
        storeCodec: options?.storeCodec,
        hashAlg: options?.hashAlg,
        pin: !!options?.pin,
        timeout: options?.timeout || 3000,
      }
    );
    if (options?.pin) {
      await this.client.ipfs.pin.add(cid, { recursive: true });
      this.client.ipfs.dht.provide(cid);
    }
    return cid;
  }

  async load<T>(
    cid: CID | string,
    path?: string,
    options: GetOptions = {}
  ): Promise<T> {
    const stored = await this.client.ipfs.dag.get(
      typeof cid === "string" ? CID.parse(cid) : cid,
      { path, timeout: 3000, ...options }
    );
    return stored.value as T;
  }
}

export class ClientDIDDag<
  Plugins extends PluginEventDef = PluginEventDef
> extends DIDDag {
  constructor(client: CinderlinkClientInterface<Plugins>) {
    super(client.did, new ClientDag(client), client.logger.module("dag"));
  }
}
