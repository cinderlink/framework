import { CandorClient } from "@candor/client";

export class CandorServer {
  constructor(private _client: CandorClient) {}

  get client() {
    return this._client;
  }

  async start() {
    await this.client.start();
  }

  async stop() {
    await this.client.stop();
  }
}
export default CandorServer;
