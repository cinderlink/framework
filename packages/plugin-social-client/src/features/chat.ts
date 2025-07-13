import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import {
  SocialChatMessage,
  SocialNotificationType,
} from "@cinderlink/plugin-social-core";
import { ProtocolRequest, SubLoggerInterface } from "@cinderlink/core-types";
import { encodePayload } from "@cinderlink/protocol";
import { v4 as uuid } from "uuid";
import SocialClientPlugin from "../plugin";
import { NotificationGenerator, SocialNotifications } from "./notifications";

export class SocialChat {
  logger: SubLoggerInterface;
  constructor(private plugin: SocialClientPlugin) {
    this.logger = plugin.logger.submodule("chat");
  }

  async start() {
    this.plugin.notifications.addGenerator({
      id: "social/chatMessage",
      schemaId: "social",
      tableId: "chat_messages",
      enabled: true,
      async insert(this: SocialNotifications, message: SocialChatMessage) {
        if (
          message?.from === this.plugin.client?.id ||
          message.to !== this.plugin.client?.id
        )
          return;

        const type: SocialNotificationType = "chat/message/received";
        const user = await this.plugin.users.getUserByDID(message.from);
        if (!user) {
          this.logger.error("failed to get user for notification", {
            type,
            did: message.from,
          });
          return;
        }
        const hasConnection = await this.plugin.connections.hasConnectionFrom(
          message.from
        );
        if (!hasConnection) {
          this.logger.error(`no connection from ${message.from}`);
          return;
        }
        const title = "New message";
        const body = `
From: ${user?.name}
Message: ${message.message}
			`;

        const existingNotification = await this.getBySourceAndType(
          message.uid,
          type
        );

        if (!existingNotification) {
          return {
            sourceUid: message.uid,
            type,
            title,
            body,
            link: `/conversations/${message.from}`,
            metaData: { did: message.from },
            browser: {
              body,
            },
          };
        }

        return undefined;
      },
    } as NotificationGenerator<SocialChatMessage>);
  }

  stop() {
    this.plugin.notifications.disableGenerator("social/chatMessage");
  }

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
    this.logger.info(`sending chat message`);

    const cid = await this.plugin.client.dag.storeEncrypted(chatMessage, [
      message.to,
    ]);

    if (!cid) {
      this.logger.error(`failed to store chat message`, {
        message: chatMessage,
      });
      throw new Error("failed to store chat message");
    }
    const pinned = await this.plugin.client.ipfs.pins.add(cid);
    this.logger.debug(`message pinned`, {
      pinned: pinned.toString(),
    });

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
      this.logger.info(`sending chat message to offline sync`, {
        to: message.to,
        message: savedMessage,
      });

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
      } as any);
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
