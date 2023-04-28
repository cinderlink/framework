import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import { SocialChatMessage } from "@cinderlink/plugin-social-core";
import { ProtocolRequest } from "@cinderlink/core-types";
import { encodePayload } from "@cinderlink/protocol";
import { v4 as uuid } from "uuid";
import SocialClientPlugin from "../plugin";
const logModule = "plugins";
const pluginName = "social-client";
export class SocialChat {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async sendChatMessage(
    message: Partial<SocialChatMessage>
  ): Promise<SocialChatMessage> {
    if (!message.to) {
      throw new Error("no recipient specified");
    }

    const chatMessage: Omit<SocialChatMessage & ProtocolRequest, "cid"> = {
      requestId: uuid(),
      from: this.plugin.client.id,
      ...message,
    };
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/sendChatMessage: sending chat message`
    );

    const cid = await this.plugin.client.dag.storeEncrypted(chatMessage, [
      message.to,
    ]);

    if (!cid) {
      throw new Error("failed to store chat message");
    }
    const pinned = await this.plugin.client.ipfs.pin.add(cid, {
      recursive: true,
    });
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/sendChatMessage: message pinned`,
      { pinned: pinned.toString() }
    );

    const savedMessage: SocialChatMessage = await this.plugin
      .table<SocialChatMessage>("chat_messages")
      .upsert(
        { cid: cid.toString() },
        {
          ...(chatMessage as Omit<SocialChatMessage, "id">),
          cid: cid.toString(),
        }
      );

    // if the user isn't online
    const peer = this.plugin.client.peers.getPeerByDID(message.to);
    if (!peer?.connected && this.plugin.client.hasPlugin("offlineSyncClient")) {
      const offlineSync =
        this.plugin.client.getPlugin<OfflineSyncClientPluginInterface>(
          "offlineSync"
        );
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/sendChatMessage: sending chat message to offline sync`,
        {
          to: message.to,
          message: savedMessage,
        }
      );

      const encoded = await encodePayload(savedMessage as any, {
        did: this.plugin.client.did,
        sign: false,
        encrypt: true,
        recipients: [message.to],
      });

      await offlineSync?.sendMessage(message.to, {
        topic: "social/chat/message/send",
        payload: encoded.payload,
        signed: encoded.signed,
        encrypted: encoded.encrypted,
        recipients: encoded.recipients,
      });
    }

    return savedMessage;
  }

  async unseenMessagesCount(): Promise<number> {
    const count = await this.plugin
      .table<SocialChatMessage>("chat_messages")
      .query()
      .where("seenAt", "=", 0)
      .select()
      .execute()
      .then((result) => result.count());

    return count;
  }
}
