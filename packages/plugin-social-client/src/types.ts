import type { PluginEventDef } from "@cryptids/interface-plugin";

export type SocialConnectionMessage = {
  to: string;
  follow: boolean;
};

export interface SocialClientEvents extends PluginEventDef {
  publish: {
    "/social/connection": SocialConnectionMessage;
  };
  subscribe: {
    "/social/connection": SocialConnectionMessage;
  };
}
