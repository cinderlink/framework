import {
  CinderlinkClientInterface,
  PluginEventDef,
} from "@cinderlink/core-types";

export class Files<Plugins extends PluginEventDef> {
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async upload(file: ArrayBuffer): Promise<string | undefined> {
    const addResult = await this.client.ipfs.add(file, { pin: true });
    return addResult?.cid.toString() || undefined;
  }

  async download(cid: string): Promise<Buffer | undefined> {
    const chunks = [];
    for await (const chunk of this.client.ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);
    return content;
  }
}
