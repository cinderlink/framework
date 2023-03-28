import minimist from "minimist";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { ethers } from "ethers";
import { createServer } from "@cinderlink/server";
import {
  createSignerDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { HttpApi } from "ipfs-http-server";
import { HttpGateway } from "ipfs-http-gateway";
import events from "events";

events.setMaxListeners(1024);

const argv = minimist(process.argv.slice(2));
const [command] = argv._;
const configPath = argv.config || "cinderlink.config.js";

if (command === "help" || argv.help) {
  console.log(`${chalk.yellow("usage")}: cinderlink [command] [options]

${chalk.yellow("commands")}:
  ${chalk.cyan("init")}    ${chalk.gray("initialize a new cinderlink config")}
  ${chalk.cyan("help")}    ${chalk.gray("show this help message")}
  ${chalk.cyan("start")}   ${chalk.gray("start a cinderlink server")}

${chalk.yellow("options")}:
  ${chalk.cyan("--config")} ${chalk.gray(
    "path to config file (default: cinderlink.config.js)"
  )}
`);
  process.exit(0);
}

if (command === "init") {
  console.log(
    `initializing ${chalk.cyan("cinderlink")} at ${chalk.yellow(configPath)}`
  );
  const wallet = ethers.Wallet.createRandom();
  fs.writeFileSync(
    configPath,
    `export default {
        app: "candor.social",
        mnemonic: "${wallet.mnemonic.phrase}",
        accountNonce: 0,
        plugins: [
          ["@cinderlink/protocol"],
          ["@cinderlink/plugin-social-server"],
          ["@cinderlink/plugin-identity-server"],
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
      };`
  );
  process.exit(0);
}

if (command !== "start") {
  console.error(`unknown command ${chalk.yellow(command)}`);
  process.exit(1);
}
(async () => {
  const resolvedConfigPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedConfigPath)) {
    console.error(`no config found at ${chalk.yellow(configPath)}`);
    process.exit(1);
  }

  console.info("resolved config", resolvedConfigPath);
  const { default: config } = await import(resolvedConfigPath);
  if (!config.mnemonic) {
    console.error(`no mnemonic found in ${chalk.yellow(configPath)}`);
    process.exit(1);
  }

  const wallet = ethers.Wallet.fromMnemonic(config.mnemonic);
  if (!wallet) {
    console.error(`invalid mnemonic in ${chalk.yellow(configPath)}`);
    process.exit(1);
  }

  console.log(`loading ${chalk.cyan("plugins")}...`);
  const plugins = (
    await Promise.all(
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
            console.info(`importing plugin from ${chalk.yellow(pathname)}`);
            const Plugin = await import(pathname);
            return [Plugin.default, options];
          }
          return undefined;
        }
      )
    )
  ).filter((p) => !!p);

  console.log(`starting ${chalk.cyan("cinderlink")}...`);
  console.info(config);
  const { did } = await createSignerDID(
    config.app,
    wallet,
    config.accountNonce
  );
  const addressVerification = await signAddressVerification(
    config.app,
    did.id,
    wallet
  );
  const server = await createServer({
    did,
    address: wallet.address,
    addressVerification,
    plugins,
    nodes: config.nodes,
    options: config.ipfs,
  });
  server.client.initialConnectTimeout = 1;
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
    console.log(`stopping ${chalk.cyan("cinderlink")}...`);
    await server.stop();
    process.exit(0);
  });
})();
