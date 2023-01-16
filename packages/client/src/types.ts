import type { PluginEventDef, PluginInterface } from "@candor/core-types";
import type { CandorClient } from "./client";

export type CandorWithPlugins<Plugins extends PluginInterface[] = []> =
  CandorClient<PluginEventDef> & {
    plugins: {
      [K in Plugins[number]["id"]]: Plugins[number];
    };
  };
