import { SyncSchemaOptions } from "@cinderlink/core-types";
import SocialClientPluginInterface from "./interface/client-plugin";

export const SocialSyncConfig: SyncSchemaOptions = {
  social: {
    users: {
      confirmations: 2,
      frequency: 1000 * 60 * 3,
      chunkSize: 100,
    },
    chat_messages: {
      confirmations: 2,
      frequency: 1000 * 10,
      chunkSize: 100,
      allowIncoming: async (_, peer, client) => {
        // only accept incoming chat messages from handshaked peers with whom we have a connection
        const social =
          client.getPlugin<SocialClientPluginInterface>("socialClient");
        if (!social) {
          return false;
        }
        return (
          !!peer.did && (await social.connections.hasConnectionWith(peer.did))
        );
      },
    },
  },
};
