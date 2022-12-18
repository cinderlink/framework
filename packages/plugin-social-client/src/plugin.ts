import type {
  PluginEventDef,
  PluginEventHandler,
  PluginInterface,
} from "@cryptids/interface-plugin";
import type { CryptidsClient, PubsubMessage } from "@cryptids/client";
import { SocialClientEvents, SocialConnectionMessage } from "./types";

export class SocialClientPlugin implements PluginInterface<SocialClientEvents> {
  id = "socialClient";
  constructor(
    public client: CryptidsClient<[SocialClientEvents]>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {}
  async stop() {}
  pubsub = {
    "/social/connection": this.onSocialConnection,
  };
  p2p = {};
  events = {};

  onSocialConnection(
    message: PubsubMessage<"/social/connection", SocialConnectionMessage>
  ) {
    console.log("social connection", message);
  }

  async sendSocialConnection(to: string, follow: boolean) {
    const message: SocialConnectionMessage = { to, follow };
    await this.client.publish("/social/connection", message);
  }
}

export default SocialClientPlugin;
