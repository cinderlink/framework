import {
  CinderlinkClientInterface,
  DAGInterface,
  DAGStoreOptions,
  PluginEventDef,
} from "@cinderlink/core-types";
import { DIDDag } from "./did/dag.js";
import { CID } from "multiformats";
import { removeUndefined } from "./did/util.js";
import { dagCbor } from "@helia/dag-cbor";
import { DistributedPinningManager } from "./distributed-pinning.js";

export class ClientDag<Plugins extends PluginEventDef = PluginEventDef>
  implements DAGInterface
{
  private distributedPinning: DistributedPinningManager<Plugins>;

  constructor(private client: CinderlinkClientInterface<Plugins>) {
    this.distributedPinning = new DistributedPinningManager<Plugins>(client);
  }

  async store<T>(data: T, options?: DAGStoreOptions): Promise<CID> {
    // Use dag-cbor by default for efficient binary storage
    const dag = dagCbor(this.client.ipfs);
    const cid = await dag.add(
      removeUndefined(data as Record<string, unknown>)
    );
    
    if (options?.pin) {
      try {
        // Use distributed pinning instead of just local pinning
        const pinResults = await this.distributedPinning.pin(cid, {
          name: `dag-${cid.toString().slice(-8)}`,
          meta: {
            type: 'dag',
            timestamp: new Date().toISOString()
          }
        });

        // Log results for debugging
        if (pinResults.errors.length > 0) {
          console.warn('Some pinning operations failed:', pinResults.errors);
        } else {
          const locations: string[] = [];
          if (pinResults.local) locations.push('local');
          if (pinResults.peers.length > 0) locations.push(`${pinResults.peers.length} peers`);
          if (pinResults.remote) locations.push('Pinata');
          console.log(`✅ Pinned to: ${locations.join(', ')}`);
        }
        
        // DHT provide (async but don't await to avoid blocking)
        this.client.ipfs.libp2p.contentRouting.provide(cid).catch(() => {
          // Ignore DHT errors in test mode or when no DHT is available
        });
      } catch (error) {
        console.error(error);
      }
    }
    return cid;
  }

  async load<T>(
    cid: CID | string,
    _path?: string,
    _options?: Record<string, unknown>
  ): Promise<T> {
    // Use dag-cbor by default
    const dag = dagCbor(this.client.ipfs);
    const parsedCid = typeof cid === "string" ? CID.parse(cid) : cid;
    
    // @helia/dag-cbor get() takes just a CID, path is handled differently
    const stored = await dag.get(parsedCid);
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
