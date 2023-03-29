import {
  CinderlinkClientInterface,
  PluginEventDef,
} from "@cinderlink/core-types";

export class Files<Plugins extends PluginEventDef> {
  constructor(private client: CinderlinkClientInterface<Plugins>) {}

  async uploadToIPFS(file: ArrayBuffer): Promise<string | undefined> {
    const addResult = await this.client.ipfs.add(file, { pin: true });
    if (addResult && addResult.cid) {
      const cid = addResult.cid.toString();
      await this.client.ipfs.pin.add(cid);
      return cid;
    }
    return;
  }

  async readFromIPFS(cid: string): Promise<Buffer | undefined> {
    const chunks = [];
    for await (const chunk of this.client.ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);
    return content;
  }
}
