import { CID } from "multiformats/cid";
import { DagKeyval, DAGInterface } from "@candor/core-types";

export class IPLDKeyval<
  Data extends Record<string, unknown> = Record<string, unknown>
> implements DagKeyval
{
  public data: Data;
  public loaded: boolean = false;
  constructor(
    public id: string,
    public dag: DAGInterface,
    public encrypted = false
  ) {
    this.data = {} as Data;
  }

  async load(cid: CID) {
    const data = await this.dag.load<Data>(cid);
    if (!data) {
      throw new Error("Failed to load keyval store");
    }

    this.data = data;
    this.loaded = true;
  }
}
