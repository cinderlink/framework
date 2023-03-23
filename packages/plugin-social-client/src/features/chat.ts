import { v4 as uuid } from "uuid";
import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import {
  SocialChatMessage,
  SocialClientEvents,
} from "@cinderlink/plugin-social-core";
import {
  EncodingOptions,
  IncomingP2PMessage,
  ProtocolRequest,
} from "@cinderlink/core-types";
import SocialClientPlugin from "../plugin";

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
    console.info("sending chat message");

    const cid = await this.plugin.client.dag.storeEncrypted(chatMessage, [
      message.to,
    ]);

    if (!cid) {
      throw new Error("failed to store chat message");
    }
    const pinned = await this.plugin.client.ipfs.pin.add(cid, {
      recursive: true,
    });
    console.info(`/plugin/social/chat/message/send > pinned`, {
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

    const { id, ...toSend } = savedMessage;

    const peer = this.plugin.client.peers.getPeerByDID(message.to);
    // if the peer isn't online
    if (!peer || !peer.connected) {
      const encoded = await (
        this.plugin.client.plugins.cinderlink as any
      )?.encodeMessage(
        {
          topic: "/social/chat/message/send",
          payload: toSend,
        },
        {
          encrypt: true,
          did: this.plugin.client.did,
        }
      );

      if (!encoded) {
        throw new Error("failed to encode chat message");
      }

      // it seems like giving another application cursor focus will cause the
      // application to stop sending messages

      console.info("sending chat message offline");
      await this.plugin.client
        .getPlugin<OfflineSyncClientPluginInterface>("offlineSyncClient")
        ?.sendMessage<SocialClientEvents, "/social/chat/message/send">(
          message.to,
          encoded
        );
      console.info("done sending chat message offline");
    } else {
      await this.plugin.client.request<SocialClientEvents>(
        peer.peerId.toString(),
        {
          topic: "/social/chat/message/send",
          payload: toSend,
        }
      );
    }

    this.plugin.emit("/chat/message/sent", savedMessage);

    return savedMessage;
  }

  async onMessageReceived(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/chat/message/send",
      EncodingOptions
    >
  ) {
    if (message.payload.to !== this.plugin.client.id) {
      console.warn(
        `plugin/social/client > received chat message request for another user (to: ${message.payload.to})`
      );
      return;
    }
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message request from unauthorized peer`
      );
      return;
    }

    // TODO: server identity check
    // if (message.peer.did !== message.payload.from) {
    //   console.warn(
    //     `plugin/social/client > received chat message request from a peer with a different did (from: ${message.payload.from}, peer.did: ${message.peer.did})`
    //   );
    //   return;
    // }

    console.info(
      `plugin/social/client > received chat message request...`,
      message.payload
    );

    const { cid, ...msg } = message.payload;

    // if (!cid) {
    //   console.warn(
    //     `plugin/social/client > received chat message request with invalid cid`,
    //     message.payload
    //   );
    //   return;
    // }

    // const parsed = CID.parse(cid);
    // if (!parsed) {
    //   console.warn(
    //     `plugin/social/client > received chat message request with invalid cid`,
    //     { message, parsed }
    //   );
    //   return;
    // }

    // const fromIPFS: SocialChatMessage | undefined = await (
    //   this.plugin.client.dag.load(parsed, undefined, {
    //     timeout: 5000,
    //   }) as Promise<SocialChatMessage>
    // ).catch((err) => {
    //   console.warn(
    //     `plugin/social/client > failed to load chat message from IPFS`,
    //     err
    //   );
    //   console.info({ cid: parsed.toString() });
    //   return undefined;
    // });

    // if (!fromIPFS) {
    //   console.warn(
    //     `plugin/social/client > received chat message request with invalid cid`,
    //     { message, fromIPFS }
    //   );
    //   return;
    // }
    // console.info(`plugin/social/client > loaded message from IPFS`, {
    //   cid,
    //   msg,
    //   fromIPFS,
    // });
    // const sortedKeysIPFS = Object.keys(fromIPFS).sort();
    // const sortedIPFS = sortedKeysIPFS.reduce((acc, key) => {
    //   acc[key] = fromIPFS[key as keyof SocialChatMessage];
    //   return acc;
    // }, {} as Record<string, unknown>);
    // const sortedKeysMsg = Object.keys(msg).sort();
    // const sortedMsg = sortedKeysMsg.reduce((acc, key) => {
    //   acc[key] = (msg as any)[key];
    //   return acc;
    // }, {} as Record<string, unknown>);
    // if (JSON.stringify(sortedIPFS) !== JSON.stringify(sortedMsg)) {
    //   console.warn(
    //     `plugin/social/client > received chat message request with invalid cid`,
    //     { expected: sortedIPFS, received: sortedMsg }
    //   );
    //   return;
    // }

    const stored = await this.plugin
      .table<SocialChatMessage>("chat_messages")
      .upsert(
        { cid },
        {
          ...msg,
          acceptedAt: Date.now(),
        }
      );

    console.info(`plugin/social/client > stored chat message`, stored);
    this.plugin.emit("/chat/message/received", stored);

    console.info(
      `plugin/social/client > saved incoming chat message (cid: ${cid})`,
      stored
    );
    await this.plugin.client.send<SocialClientEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/social/chat/message/confirm",
        payload: stored,
      }
    );
  }

  async onMessageConfirm(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/chat/message/confirm",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message response from unauthorized peer`
      );
      return;
    }

    const { cid } = message.payload;
    const stored = await this.plugin
      .table<SocialChatMessage>("chat_messages")
      .query()
      .where("cid", "=", cid)
      .select()
      .execute()
      .then((result) => result.first());

    if (!stored) {
      console.warn(
        `plugin/social/client > received chat message response for unknown message (cid: ${cid})`
      );
      return;
    }

    const update: Partial<SocialChatMessage> = {};
    if (message.peer.did === stored.from) {
      update.acceptedAt = Date.now();
    }
    update.confirmations = (stored.confirmations || 0) + 1;

    const updated = await this.plugin
      .table<SocialChatMessage>("chat_messages")
      .update(stored.id, update);

    this.plugin.emit("/chat/message/confirmed", updated);
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
