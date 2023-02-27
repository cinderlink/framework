import { CandorClientInterface } from "@candor/core-types";

export class CandorServer {
  constructor(private _client: CandorClientInterface) {}

  get client() {
    return this._client;
  }

  async start() {
    await this.client.start();

    process.on("SIGINT", async () => {
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    await this.client.stop();
  }
}
export default CandorServer;
