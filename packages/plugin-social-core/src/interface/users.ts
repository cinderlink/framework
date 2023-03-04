import { Peer } from "@candor/core-types";
import { SocialUser } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialUsersInterface {
  localUser: SocialUser;
  announceInterval: NodeJS.Timer | null;
  hasServerConnection: boolean;
  plugin: SocialClientPluginInterface;

  start(): Promise<void>;
  announce(to: string | undefined): Promise<void>;
  getLocalUser(): Promise<SocialUser | undefined>;
  getLocalUserId(): Promise<number | undefined>;
  searchUsers(query: string): Promise<SocialUser[]>;
  getUserFromServer(did: string, server?: Peer): Promise<SocialUser>;
  setState(update: Partial<SocialUser>): Promise<void>;
  saveLocalUser(): Promise<void>;
  loadLocalUser(): Promise<SocialUser>;
  getUserByDID(did: string): Promise<SocialUser | undefined>;
  getUser(userId: number): Promise<SocialUser | undefined>;
}
