import PluginInterface, { PluginEventDef } from "./plugin/types";
import CryptidsClient from "./client";

export type PluginConstructor<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Options extends Record<string, unknown> = {}
> = new (
  client: CryptidsClient<PluginEvents>,
  options?: Options
) => PluginInterface;

export type CryptidsWithPlugins<Plugins extends PluginInterface[] = []> =
  CryptidsClient<PluginEventDef> & {
    plugins: {
      [K in Plugins[number]["id"]]: Plugins[number];
    };
  };
