import type { PluginEventDef } from "@cryptids/client";

export type SocialConnectionMessage = {
  to: string;
  follow: boolean;
};

export interface SocialClientEvents extends PluginEventDef {
  send: {};
  receive: {};
  publish: {
    "/social/connection": SocialConnectionMessage;
  };
  subscribe: {
    "/social/connection": SocialConnectionMessage;
  };
  emit: {};
}
