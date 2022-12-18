import { CryptidsClient } from "@cryptids/client";

export class CryptidsServer {
  constructor(private client: CryptidsClient) {}

  async start() {
    await this.client.start();
  }

  async stop() {
    await this.client.stop();
  }
}
export default CryptidsServer;
