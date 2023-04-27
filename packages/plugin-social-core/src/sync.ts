import {
  CinderlinkClientInterface,
  Peer,
  SyncConfig,
  TableInterface,
} from "@cinderlink/core-types";
import { SocialClientPluginInterface } from "./interface";
import {
  SocialChatMessage,
  SocialPost,
  SocialReaction,
  SocialUser,
} from "./types";

export const SocialSyncConfig: Record<string, SyncConfig<any>> = {
  users: {
    syncInterval: 10000,
    query(table: TableInterface<SocialUser>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(peers: Peer[]) {
      return peers.filter((p) => p.did).map((p) => p.did as string);
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialUser, did: string) {
      return did === row.did;
    },
    async allowFetchFrom() {
      return true;
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
  chat_messages: {
    syncInterval: 3000,
    query(table: TableInterface<SocialChatMessage>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(peers: Peer[]) {
      return peers.filter((p) => !!p.did).map((p) => p.did as string);
    },
    async syncRowTo(row: SocialChatMessage, peers: Peer[]) {
      const syncTo = peers
        .map((p) => p.did as string)
        .filter((did) => did === row.from || did === row.to);
      // console.info("syncRowTo", row, syncTo);
      return syncTo;
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialChatMessage, did: string) {
      return did === row.from;
    },
    async allowFetchRowFrom(
      row: SocialChatMessage,
      did: string,
      _: TableInterface,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        [row.from, row.to].includes(did) ||
        client.peers
          .getServers()
          .map((s) => s.did)
          .includes(did)
      );
    },
    incomingRateLimit: 2500,
    outgoingRateLimit: 25000,
  },
  connections: {
    syncInterval: 5000,
    query(table: TableInterface<SocialChatMessage>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(peers: Peer[]) {
      return peers.filter((p) => p.did).map((p) => p.did as string);
    },
    async syncRowTo(row: SocialChatMessage, peers: Peer[]) {
      return peers
        .filter((p) => p.did)
        .map((p) => p.did as string)
        .filter((did) => did === row.from || did === row.to);
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialChatMessage, did: string) {
      return did === row.from;
    },
    async allowFetchRowFrom(
      row: SocialChatMessage,
      did: string,
      _: TableInterface,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        [row.from, row.to].includes(did) ||
        client.peers
          .getServers()
          .map((s) => s.did)
          .includes(did)
      );
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
  posts: {
    syncInterval: 10000,
    query(table: TableInterface<SocialPost>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(
      peers: Peer[],
      _: TableInterface<SocialPost>,
      client: CinderlinkClientInterface<any>
    ) {
      const validPeers = peers.filter((p) => p.did).map((p) => p.did as string);
      const syncPeers = (
        client.hasPlugin("socialClient")
          ? (
              await Promise.all(
                validPeers.map(async (did) => {
                  const connection = await (
                    client.plugins
                      .socialClient as unknown as SocialClientPluginInterface
                  ).connections.hasConnectionWith(did);
                  return connection ? did : undefined;
                })
              )
            ).filter((did) => !!did)
          : validPeers
      ) as string[];
      console.info("posts sync", syncPeers, validPeers, peers);
      return syncPeers;
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialPost, did: string) {
      return did === row.did;
    },
    async allowFetchRowFrom(
      row: SocialPost,
      did: string,
      _: TableInterface,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.did == did ||
        client.peers
          .getServers()
          .map((s) => s.did)
          .includes(did)
      );
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
  comments: {
    syncInterval: 15000,
    query(table: TableInterface<SocialPost>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(
      peers: Peer[],
      _: TableInterface<SocialPost>,
      client: CinderlinkClientInterface<any>
    ) {
      const validPeers = peers.filter((p) => p.did).map((p) => p.did as string);
      const syncPeers = (
        client.hasPlugin("socialClient")
          ? (
              await Promise.all(
                validPeers.map(async (did) => {
                  const connection = await (
                    client.plugins
                      .socialClient as unknown as SocialClientPluginInterface
                  ).connections.hasConnectionWith(did);
                  return connection ? did : undefined;
                })
              )
            ).filter((did) => !!did)
          : validPeers
      ) as string[];
      return syncPeers;
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialPost, did: string) {
      return did === row.did;
    },
    async allowFetchRowFrom(
      row: SocialPost,
      did: string,
      _: TableInterface,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.did == did ||
        client.peers
          .getServers()
          .map((s) => s.did)
          .includes(did)
      );
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
  reactions: {
    syncInterval: 15000,
    query(table: TableInterface<SocialPost>, params) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(
      peers: Peer[],
      _: TableInterface<SocialPost>,
      client: CinderlinkClientInterface<any>
    ) {
      const validPeers = peers.filter((p) => p.did).map((p) => p.did as string);
      const syncPeers = (
        client.hasPlugin("socialClient")
          ? (
              await Promise.all(
                validPeers.map(async (did) => {
                  const connection = await (
                    client.plugins
                      .socialClient as unknown as SocialClientPluginInterface
                  ).connections.hasConnectionWith(did);
                  return connection ? did : undefined;
                })
              )
            ).filter((did) => !!did)
          : validPeers
      ) as string[];
      return syncPeers;
    },
    async allowNewFrom() {
      return true;
    },
    async allowUpdateFrom(row: SocialReaction, did: string) {
      return did === row.from;
    },
    async allowFetchRowFrom(
      row: SocialReaction,
      did: string,
      _: TableInterface,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.from == did ||
        client.peers
          .getServers()
          .map((s) => s.did)
          .includes(did)
      );
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
};
