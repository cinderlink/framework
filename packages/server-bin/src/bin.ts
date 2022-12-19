import minimist from "minimist";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import chalk from "chalk";
import { createCryptidsServer } from "@cryptids/server";
import { HttpApi } from "ipfs-http-server";
import { HttpGateway } from "ipfs-http-gateway";
import { createCryptidsSeed } from "@cryptids/client";

const argv = minimist(process.argv.slice(2));
const [command, ...args] = argv._;
const configPath = argv.config || "./cryptids.config.json";

if (command === "help" || argv.help) {
  console.log(`${chalk.yellow("usage")}: cryptids [command] [options]

${chalk.yellow("commands")}:
  ${chalk.cyan("init")}    ${chalk.gray("initialize a new cryptids config")}
  ${chalk.cyan("help")}    ${chalk.gray("show this help message")}
  ${chalk.cyan("start")}   ${chalk.gray("start a cryptids server")}

${chalk.yellow("options")}:
  ${chalk.cyan("--config")} ${chalk.gray(
    "path to config file (default: ./cryptids.config.json)"
  )}
`);
  process.exit(0);
}

if (command === "init") {
  console.log(
    `initializing ${chalk.cyan("cryptids")} at ${chalk.yellow(configPath)}`
  );
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        seed: crypto.randomBytes(32).toString("hex"),
        plugins: [
          ["@cryptids/plugin-social-server"],
          ["@cryptids/plugin-identity-server"],
        ],
        ipfs: {
          config: {
            Addresses: {
              Swarm: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
              API: ["/ip4/127.0.0.1/tcp/5001"],
              Gateway: ["/ip4/127.0.0.1/tcp/8080"],
            },
            Bootstrap: [],
          },
        },
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (command !== "start") {
  console.error(`unknown command ${chalk.yellow(command)}`);
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  console.error(`no config found at ${chalk.yellow(configPath)}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (!config.seed) {
  console.error(`no seed found in ${chalk.yellow(configPath)}`);
  process.exit(1);
}

(async () => {
  console.log(`loading ${chalk.cyan("plugins")}...`);
  const plugins = await Promise.all(
    (config.plugins || []).map(
      async ([pathname, options]: [string, Record<string, unknown>]) => {
        // resolve the plugin relative to the config file
        const dirname = path.resolve(
          path.dirname(configPath),
          "node_modules",
          pathname
        );
        if (fs.existsSync(dirname)) {
          const pkg = path.resolve(dirname, "package.json");
          if (fs.existsSync(pkg)) {
            const { main } = JSON.parse(fs.readFileSync(pkg, "utf8"));
            pathname = path.resolve(dirname, main);
          } else {
            pathname = path.resolve(dirname, "index.js");
          }
        }
        const Plugin = await import(pathname);
        return [Plugin.default.default, options];
      }
    )
  );

  console.log(`starting ${chalk.cyan("cryptids")}...`);
  const seed = await createCryptidsSeed(config.seed);
  const server = await createCryptidsServer(
    seed,
    plugins,
    config.nodes,
    config.ipfs
  );
  await server.start();

  console.log(`starting ${chalk.cyan("http api")}...`);
  const api = new HttpApi(server.client.ipfs);
  await api.start();

  console.log(`starting ${chalk.cyan("http gateway")}...`);
  const gateway = new HttpGateway(server.client.ipfs);
  await gateway.start();

  const addrs = await server.client.ipfs.swarm.localAddrs();
  console.info(`listening: ${addrs.join(", ")}`);

  process.on("SIGINT", async () => {
    console.log(`stopping ${chalk.cyan("http gateway")}...`);
    await gateway.stop();
    console.log(`stopping ${chalk.cyan("http api")}...`);
    await api.stop();
    console.log(`stopping ${chalk.cyan("cryptids")}...`);
    await server.stop();
    process.exit(0);
  });
})();
