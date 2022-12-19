import type {
  PluginInterface,
  CryptidsClient,
  PubsubMessage,
} from "@cryptids/client";
import {
  SocialAnnounceMessage,
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialClientEvents,
  SocialConnectionMessage,
} from "./types";

export class SocialClientPlugin implements PluginInterface<SocialClientEvents> {
  id = "socialClient";
  name = "guest";
  avatar = "";
  interval: NodeJS.Timer | null = null;

  constructor(
    public client: CryptidsClient<SocialClientEvents>,
    public options: Record<string, unknown> = {}
  ) {}

  async start() {
    let hasConnected = false;
    console.info("social client plugin started");
    this.client.on("/peer/connect", () => {
      if (!hasConnected) {
        hasConnected = true;
        setTimeout(() => {
          this.client.publish("/social/announce", {
            name: this.name,
            avatar: this.avatar,
          });
        }, 3000);
      }
    });
    this.interval = setInterval(() => {
      if (!hasConnected) return;
      this.client.publish("/social/announce", {
        name: this.name,
        avatar: this.avatar,
      });
    }, Number(this.options.interval || 1000 * 15));
  }

  async stop() {
    console.info("social client plugin stopped");
  }

  setName() {
    this.name = "guest";
  }

  setAvatar() {
    this.avatar = "";
  }

  setState({ name, avatar }: { name: string; avatar: string }) {
    this.name = name;
    this.avatar = avatar;
  }

  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
  };
  p2p = {
    "/social/updates/request": this.onSocialUpdatesRequest,
    "/social/updates/response": this.onSocialUpdatesResponse,
  };
  events = {};

  onSocialConnection(message: PubsubMessage<SocialConnectionMessage>) {
    console.log("social connection", message);
  }

  onSocialAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
    console.log("social announce", message);
  }

  onSocialUpdatesRequest(message: PubsubMessage<SocialUpdatesRequestMessage>) {}

  onSocialUpdatesResponse(
    message: PubsubMessage<SocialUpdatesResponseMessage>
  ) {}

  async sendSocialConnection(to: string, follow: boolean) {
    const message: SocialConnectionMessage = { to, follow };
    await this.client.publish("/social/connection", message);
  }
}

export default SocialClientPlugin;
