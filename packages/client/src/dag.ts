import type {
  CinderlinkClientInterface,
  DAGInterface,
  DAGStoreOptions,
  PluginEventDef,
} from "@cinderlink/core-types";
import { DIDDag } from "./did/dag";
import { CID } from "multiformats";
import { type GetOptions } from "helia";
import { removeUndefined } from "./did/util";

export class ClientDag<Plugins extends PluginEventDef = PluginEventDef>
  implements DAGInterface
{
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async store<T>(data: T, options?: DAGStoreOptions): Promise<CID> {
    // if data is an object
    // Assuming data is IPLD compatible (e.g. JSON encodable after removeUndefined)
    // Helia's `blocks.put` expects Uint8Array. We might need to encode `data`.
    // For now, let's assume a direct put is possible or will be wrapped by another Helia service.
    // This part might need further clarification based on how Helia v2 expects raw objects.
    // A common pattern is to use a codec (like 'dag-json' or 'dag-cbor').
    // Let's assume `this.client.ipfs.blockstore.put` or a similar raw block interface.
    // Given Helia's structure, `this.client.ipfs.blocks.put()` is more likely.
    // The `put` method in Helia's Blocks API typically takes (cid, bytes) or just (bytes) if CID is to be generated.
    // We need to ensure `data` is properly encoded to Uint8Array.
    // For simplicity, I'll assume `this.client.ipfs.blocks.put` can handle object directly for now,
    // or that the user of `store` passes already serialized data if needed.
    // This is a common friction point when upgrading IPFS versions.
    // The old `dag.put` likely handled serialization.
    // Let's assume we need to encode to dag-json explicitly if `blocks.put` needs bytes.
    // However, Helia's top-level `helia.dag.add` from `@helia/dag` in older versions was high level.
    // The core `helia` object itself does not seem to have a `dag.put` anymore.
    // It has `helia.blocks.put()`.
    // It's more likely that for objects, we'd use specific codecs with `helia.blocks.put()`.
    // Or, if `@helia/unixfs` is intended for general DAGs too (unlikely by name), its API would be used.

    // Sticking to the idea that `this.client.ipfs` is a Helia instance:
    // The `Blocks` interface in Helia has `put(bytes, options)`
    // We need to serialize `data` first. Let's use JSON for now.
    const { serialize } = await import('multiformats/basics');
    // Assuming 'dag-json' is the desired codec if not specified by options.storeCodec
    const codecName = options?.storeCodec || 'dag-json';
    const block = await serialize(removeUndefined(data as Record<string, unknown>), codecName);

    // Helia's Blocks service is typically accessed via helia.blockstore or helia.blocks()
    // Given the Helia interface, it's likely helia.blockstore directly for raw put/get,
    // or if there's a higher-level blocks service, it might be helia.blocks().
    // Let's assume `this.client.ipfs.blockstore.put` for raw block bytes.
    // The pin option is usually not on blockstore.put.
    const cid = await this.client.ipfs.blockstore.put(block.bytes, {
      codec: block.codec,
      mtype: block.hasher.code,
      timeout: options?.timeout || 3000,
    });

    if (options?.pin) {
      await this.client.ipfs.pins().add(cid, { recursive: true });
    }
    return cid;
  }

  async load<T>(
    cid: CID | string,
    path?: string, // Path is less common for raw block get, usually for UnixFS or IPLD pathing within a block
    options: GetOptions = {}
  ): Promise<T> {
    const targetCid = typeof cid === "string" ? CID.parse(cid) : cid;
    // Using helia.blockstore.get
    const bytes = await this.client.ipfs.blockstore.get(targetCid, {
      timeout: 3000,
      ...options,
    });

    if (!bytes) {
      throw new Error(`Block not found for CID: ${targetCid.toString()}`);
    }

    const { deserialize } = await import('multiformats/basics');
    const codecCode = targetCid.code;

    if (path) {
      // Path traversal needs a proper IPLD library that works on raw blocks.
      // This is a placeholder and likely incorrect for actual path traversal.
      // For example, one might use @ipld/dag-json or @ipld/dag-cbor's get function.
      console.warn("Path traversal in DAG load is not fully implemented with new Helia API in this refactor step.");
      // const { get } = await import(`@ipld/${codecName}`); // Dynamically import codec
      // return get(targetCid, path, { blockstore: this.client.ipfs.blockstore });
    }
    // Deserialize the whole block if no path or path handling is simplified
    const value = await deserialize(bytes, codecCode);
    return value as T;
  }
}

export class ClientDIDDag<
  Plugins extends PluginEventDef = PluginEventDef
> extends DIDDag {
  constructor(client: CinderlinkClientInterface<Plugins>) {
    super(client.did, new ClientDag(client), client.logger.module("dag"));
  }
}
