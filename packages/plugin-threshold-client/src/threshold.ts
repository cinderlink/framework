import {
  CinderlinkClientInterface,
  TableInterface,
} from "@cinderlink/core-types";
import {
  ThresholdOwnedData,
  ThresholdPeerData,
} from "@cinderlink/plugin-threshold-common";

export class ThresholdClient {
  constructor(private client: CinderlinkClientInterface) {}

  get schema() {
    const schema = this.client.getSchema("threshold");
    if (!schema) {
      throw new Error("Schema not found: threshold");
    }
    return schema;
  }

  get ownData() {
    const table = this.schema.getTable<ThresholdOwnedData>("ownData");
    if (!table) {
      throw new Error("Table not found: ownData");
    }
    return table;
  }

  get peerData() {
    const table = this.schema.getTable<ThresholdPeerData>("peerData");
    if (!table) {
      throw new Error("Table not found: ownData");
    }
    return table;
  }

  async getOwnData(name: string): Promise<ThresholdOwnedData> {
    const data = await this.ownData
      .query()
      .where("name", "=", name)
      .select()
      .execute()
      .then((res) => res.first());

    if (!data) {
      throw new Error("Data not found");
    }
    return data;
  }

  setOwnData(
    data: Partial<ThresholdOwnedData> & { name: string }
  ): Promise<ThresholdOwnedData> {
    return this.ownData.upsert({ name: data.name }, data);
  }

  async getPeerData(cid: string, did: string): Promise<ThresholdPeerData> {
    const data = await this.peerData
      .query()
      .where("cid", "=", cid)
      .where("did", "=", did)
      .select()
      .execute()
      .then((res) => res.first());

    if (!data) {
      throw new Error(`Peer data not found: (cid: ${cid}, did: ${did})`);
    }
    return data;
  }

  setPeerData(
    data: Partial<ThresholdPeerData> & { cid: string; did: string }
  ): Promise<ThresholdPeerData> {
    return this.peerData.upsert({ cid: data.cid, did: data.did }, data);
  }

  async syncOwnData(limit: number = 100): Promise<void> {
    const data = await this.ownData
      .query()
      .select()
      .orderBy("syncedAt", "asc")
      .limit(limit)
      .execute()
      .then((res) => res.all());
  }

  static split(data: Uint8Array, chunks: number): Uint8Array[] {
    const size = Math.ceil(data.length / chunks);
    const result = [];
    for (let i = 0; i < data.length; i += size) {
      result.push(data.slice(i, i + size));
    }
    return result;
  }

  static merge(data: Uint8Array[]): Uint8Array {
    const merged = new Uint8Array(
      data.reduce((acc, cur) => acc + cur.length, 0)
    );
    for (const chunk of data) {
      merged.set(chunk, merged.length - chunk.length);
    }
    return merged;
  }
}
