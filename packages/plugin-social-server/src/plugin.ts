import type {
  PluginInterface,
  CryptidsClient,
  PubsubMessage,
} from "@cryptids/client";
import { SocialConnectionMessage } from "@cryptids/plugin-social-client";
import {
  SocialAnnounceMessage,
  SocialClientEvents,
} from "@cryptids/plugin-social-client";

export type SocialServerEvents = {
  publish: {};
  subscribe: SocialClientEvents["subscribe"];
  send: {};
  receive: {};
  emit: {};
};

export class SocialServerPlugin implements PluginInterface<SocialServerEvents> {
  id = "socialServer";
  constructor(
    public client: CryptidsClient<SocialServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info("social server plugin started");
  }
  async stop() {
    console.info("social server plugin stopped");
  }
  p2p = {};
  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
  };
  events = {};

  onSocialAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
    console.log("social announce", message);
  }

  onSocialConnection(message: PubsubMessage<SocialConnectionMessage>) {
    console.log("social connection", message);
  }
}

export default SocialServerPlugin;
