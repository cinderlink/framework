import {
  CinderlinkClientInterface,
  DAGInterface,
  DAGStoreOptions,
  PluginEventDef,
} from "@cinderlink/core-types";
import { DIDDag } from "./did/dag";
import { CID } from "multiformats";
import { removeUndefined } from "./did/util";
import { dagCbor } from "@helia/dag-cbor";

export class ClientDag<Plugins extends PluginEventDef = PluginEventDef>
  implements DAGInterface
{
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async store<T>(data: T, options?: DAGStoreOptions): Promise<CID> {
    // Use dag-cbor by default for efficient binary storage
    const dag = dagCbor(this.client.ipfs);
    const cid = await dag.add(
      removeUndefined(data as Record<string, unknown>)
    );
    
    if (options?.pin) {
      try {
        // Convert AsyncGenerator to Promise by consuming it
        for await (const _ of this.client.ipfs.pins.add(cid as any, { 
          signal: AbortSignal.timeout(5000) 
        })) {
          // Just consume the generator
        }
      } catch (error) {
        // Ignore pin errors
      }
      
      // DHT provide
      try {
        this.client.ipfs.libp2p.contentRouting.provide(cid as any);
      } catch (error) {
        // Ignore DHT errors
      }
    }
    return cid;
  }

  async load<T>(
    cid: CID | string,
    _path?: string,
    _options?: any
  ): Promise<T> {
    // Use dag-cbor by default
    const dag = dagCbor(this.client.ipfs);
    const parsedCid = typeof cid === "string" ? CID.parse(cid) : cid;
    
    // @helia/dag-cbor get() takes just a CID, path is handled differently
    const stored = await dag.get(parsedCid as any);
    return stored as T;
  }
}

export class ClientDIDDag<
  Plugins extends PluginEventDef = PluginEventDef
> extends DIDDag {
  constructor(client: CinderlinkClientInterface<Plugins>) {
    super(client.did, new ClientDag(client), client.logger.module("dag"));
  }
}
