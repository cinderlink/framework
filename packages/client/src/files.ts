import {
  CinderlinkClientInterface,
  PluginEventDef,
} from "@cinderlink/core-types";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";

export class Files<Plugins extends PluginEventDef> {
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async upload(file: ArrayBuffer): Promise<string | undefined> {
    const fs = unixfs(this.client.ipfs);
    const cid = await fs.addBytes(new Uint8Array(file));
    // Assuming we always want to pin on upload based on original { pin: true }
    await this.client.ipfs.pins.add(cid);
    return cid.toString() || undefined;
  }

  async download(cid: string): Promise<Buffer | undefined> {
    const fs = unixfs(this.client.ipfs);
    const chunks = [];
    for await (const chunk of fs.cat(CID.parse(cid))) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);
    return content;
  }
}
