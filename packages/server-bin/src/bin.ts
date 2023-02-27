import minimist from "minimist";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import chalk from "chalk";
import { createServer } from "@candor/server";
import { createSeed } from "@candor/client";
import { HttpApi } from "ipfs-http-server";
import { HttpGateway } from "ipfs-http-gateway";

const argv = minimist(process.argv.slice(2));
const [command] = argv._;
const configPath = argv.config || "./candor.config.json";

if (command === "help" || argv.help) {
  console.log(`${chalk.yellow("usage")}: candor [command] [options]

${chalk.yellow("commands")}:
  ${chalk.cyan("init")}    ${chalk.gray("initialize a new candor config")}
  ${chalk.cyan("help")}    ${chalk.gray("show this help message")}
  ${chalk.cyan("start")}   ${chalk.gray("start a candor server")}

${chalk.yellow("options")}:
  ${chalk.cyan("--config")} ${chalk.gray(
    "path to config file (default: ./candor.config.json)"
  )}
`);
  process.exit(0);
}

if (command === "init") {
  console.log(
    `initializing ${chalk.cyan("candor")} at ${chalk.yellow(configPath)}`
  );
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        seed: crypto.randomBytes(32).toString("hex"),
        plugins: [
          ["@candor/protocol"],
          ["@candor/plugin-social-server"],
          ["@candor/plugin-identity-server"],
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
        return [Plugin.default, options];
      }
    )
  );

  console.log(`starting ${chalk.cyan("candor")}...`);
  console.info(config.plugins);
  const seed = await createSeed(config.seed);
  const server = await createServer(seed, plugins, config.nodes, config.ipfs);
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
    console.log(`stopping ${chalk.cyan("candor")}...`);
    await server.stop();
    process.exit(0);
  });
})();
