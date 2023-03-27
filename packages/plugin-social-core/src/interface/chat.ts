import { SocialChatMessage } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialChatInterface {
  plugin: SocialClientPluginInterface;

  start(): Promise<void>;

  sendChatMessage(
    message: Partial<SocialChatMessage>
  ): Promise<SocialChatMessage>;
}
