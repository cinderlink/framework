import type {
  CandorClientInterface,
  DAGInterface,
  PluginEventDef,
} from "@candor/core-types";
import { DIDDag } from "./did/dag";
import * as json from "multiformats/codecs/json";
import { CID } from "multiformats";

export class ClientDag<Plugins extends PluginEventDef = PluginEventDef>
  implements DAGInterface
{
  constructor(private client: CandorClientInterface<Plugins>) {}

  async store<T>(
    data: T,
    inputCodec = "dag-json",
    hashAlg = "sha2-256"
  ): Promise<CID> {
    const encoded = json.encode(data);
    const cid = await this.client.ipfs.dag.put(encoded, {
      inputCodec,
      hashAlg,
      pin: true,
    });
    return cid;
  }

  async load<T>(cid: CID | string, path?: string): Promise<T> {
    const stored = await this.client.ipfs.dag.get(
      typeof cid === "string" ? CID.parse(cid) : cid,
      { path }
    );
    return stored.value as T;
  }
}

export class ClientDIDDag<
  Plugins extends PluginEventDef = PluginEventDef
> extends DIDDag {
  constructor(client: CandorClientInterface<Plugins>) {
    super(client.did, new ClientDag(client));
  }
}
