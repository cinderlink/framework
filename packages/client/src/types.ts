import type { PluginEventDef, PluginInterface } from "@cinderlink/core-types";
import type { CinderlinkClient } from "./client";

export type CinderlinkWithPlugins<Plugins extends PluginInterface[] = []> =
  CinderlinkClient<PluginEventDef> & {
    plugins: {
      [K in Plugins[number]["id"]]: Plugins[number];
    };
  };
