import SocialClientPlugin from "@candor/plugin-social-client/src";
import { SocialServerPlugin } from "@candor/plugin-social-server/src";
import { PluginInterface } from "@candor/core-types";
import { createServer } from "@candor/server";
import { createSeed } from "@candor/client";

const plugins: PluginInterface[] = [];
const seed = await createSeed("debug seed");
const server = await createServer(
  seed,
  [
    [SocialClientPlugin as any, {}],
    [SocialServerPlugin as any, {}],
  ],
  [],
  {}
);
await server.start();
