import {
  CinderlinkClientInterface,
  Peer,
  SyncConfig,
  SyncQueryParams,
  TableInterface,
} from "@cinderlink/core-types";
import { SocialClientPluginInterface } from "./interface";
import {
  SocialChatMessage,
  SocialComment,
  SocialConnection,
  SocialPost,
  SocialReaction,
  SocialUser,
} from "./types";

export interface SocialSyncConfigs {
  users: SyncConfig<SocialUser>;
  chat_messages: SyncConfig<SocialChatMessage>;
  connections: SyncConfig<SocialConnection>;
  posts: SyncConfig<SocialPost>;
  comments: SyncConfig<SocialComment>;
  reactions: SyncConfig<SocialReaction>;
}

export const SocialSyncConfig: SocialSyncConfigs = {
  users: {
    syncInterval: 30000,
    syncOnChange: true,
    query(table: TableInterface<SocialUser>, params: SyncQueryParams) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    syncTo(peers: Peer[]) {
      return peers.filter((p) => p.did).map((p) => p.did as string);
    },
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialUser, did: string) {
      return did === row.did;
    },
    allowFetchFrom() {
      return true;
    },
    incomingRateLimit: 5000,
    outgoingRateLimit: 5000,
  },
  chat_messages: {
    syncInterval: 10000,
    syncOnChange: true,
    query(table: TableInterface<SocialChatMessage>, params: SyncQueryParams) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    syncTo(peers: Peer[]) {
      return peers.filter((p) => !!p.did).map((p) => p.did as string);
    },
    syncRowTo(row: SocialChatMessage, peers: Peer[]) {
      const syncTo = peers
        .map((p) => p.did as string)
        .filter((did) => did === row.from || did === row.to);
      return syncTo;
    },
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialChatMessage, did: string) {
      return did === row.from;
    },
    allowFetchRowFrom(
      row: SocialChatMessage,
      did: string,
      _: TableInterface<SocialChatMessage>,
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
    syncInterval: 10000,
    syncOnChange: true,
    query(table: TableInterface<SocialConnection>, params: SyncQueryParams) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    syncTo(peers: Peer[]) {
      return peers.filter((p) => p.did).map((p) => p.did as string);
    },
    syncRowTo(row: SocialConnection, peers: Peer[]) {
      return peers
        .filter((p) => p.did)
        .map((p) => p.did as string)
        .filter((did) => did === row.from || did === row.to);
    },
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialConnection, did: string) {
      return did === row.from;
    },
    allowFetchRowFrom(
      row: SocialConnection,
      did: string,
      _: TableInterface<SocialConnection>,
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
    syncInterval: 60000,
    syncOnChange: true,
    query(table: TableInterface<SocialPost>, params: SyncQueryParams) {
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
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialPost, did: string) {
      return did === row.did;
    },
    allowFetchRowFrom(
      row: SocialPost,
      did: string,
      _: TableInterface<SocialPost>,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.did === did ||
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
    syncInterval: 60000,
    syncOnChange: false,
    query(table: TableInterface<SocialComment>, params: SyncQueryParams) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(
      peers: Peer[],
      _: TableInterface<SocialComment>,
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
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialComment, did: string) {
      return did === row.did;
    },
    allowFetchRowFrom(
      row: SocialComment,
      did: string,
      _: TableInterface<SocialComment>,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.did === did ||
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
    syncInterval: 60000,
    syncOnChange: false,
    query(table: TableInterface<SocialReaction>, params: SyncQueryParams) {
      return table
        .query()
        .where("updatedAt", ">", params.since)
        .or((qb) => qb.where("createdAt", ">", params.since))
        .select();
    },
    async syncTo(
      peers: Peer[],
      _: TableInterface<SocialReaction>,
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
    allowNewFrom() {
      return true;
    },
    allowUpdateFrom(row: SocialReaction, did: string) {
      return did === row.from;
    },
    allowFetchRowFrom(
      row: SocialReaction,
      did: string,
      _: TableInterface<SocialReaction>,
      client: CinderlinkClientInterface<any>
    ) {
      return (
        row.from === did ||
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
