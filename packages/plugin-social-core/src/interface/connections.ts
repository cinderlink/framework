import { SocialConnection, SocialConnectionFilter } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialConnectionsInterface {
  plugin: SocialClientPluginInterface;
  start(): Promise<void>;

  createConnection(to: string): Promise<void>;
  sendConnection(connection: SocialConnection): Promise<void>;
  deleteConnection(from: string, to: string): Promise<void>;
  getConnections(
    user: string,
    filter: SocialConnectionFilter,
    limit: number
  ): Promise<SocialConnection[]>;
  getConnectionDirection(
    to: string,
    from: string
  ): "mutual" | "in" | "out" | "none";
  getConnectionsCount(
    user: string,
    filter: SocialConnectionFilter
  ): Promise<number>;
  hasConnectionTo(user: string): Promise<boolean>;
  hasConnectionFrom(user: string): Promise<boolean>;
  hasMutualConnectionTo(user: string): Promise<boolean>;
  hasConnectionWith(user: string): Promise<boolean>;
}
