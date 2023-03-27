import { CinderlinkClientInterface } from "@cinderlink/core-types";

export class CinderlinkServer {
  constructor(private _client: CinderlinkClientInterface) {}

  get client() {
    return this._client;
  }

  async start() {
    await this.client.start([]);

    process.on("SIGINT", async () => {
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    await this.client.stop();
  }
}
export default CinderlinkServer;
