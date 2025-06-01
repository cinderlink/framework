import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';
import {
  CinderlinkClientInterface,
  PluginEventDef,
} from "@cinderlink/core-types";

export class Files<Plugins extends PluginEventDef> {
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async upload(file: ArrayBuffer): Promise<string | undefined> {
    const fs = unixfs(this.client.ipfs);
    const cid = await fs.addBytes(new Uint8Array(file));
    // Pin the uploaded file
    try {
      for await (const _ of this.client.ipfs.pins.add(cid as any)) {
        // consume generator
      }
    } catch {
      // Ignore pin errors for now
    }
    return cid.toString();
  }

  async download(cid: string): Promise<Buffer | undefined> {
    const fs = unixfs(this.client.ipfs);
    const parsedCid = CID.parse(cid);
    const chunks = [];
    for await (const chunk of fs.cat(parsedCid as any)) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);
    return content;
  }
}
