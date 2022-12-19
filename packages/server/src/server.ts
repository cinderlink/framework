import { CryptidsClient } from "@cryptids/client";

export class CryptidsServer {
  constructor(private _client: CryptidsClient) {}

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
export default CryptidsServer;
