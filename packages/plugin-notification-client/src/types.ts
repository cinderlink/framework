import type { PluginEventDef } from "@cinderlink/core-types";

export type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  dismissed: boolean;
  createdAt: number;
  read?: boolean;
  link?: string;
  metaData?: Record<string, unknown>;
};

export interface NotificationClientEvents extends PluginEventDef {
  send: {};
  receive: {};
  publish: {};
  subscribe: {};
  emit: {
    "/notification/connection": NotificationPayload;
  };
}
