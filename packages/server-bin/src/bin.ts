import minimist from "minimist";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Wallet } from "ethers";
import { createServer } from "@cinderlink/server";
import {
  createSignerDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { HttpApi } from "@helia/http-api";
import { HttpGateway } from "@helia/http-gateway";
import events from "events";
import dotenv from "dotenv";

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

const initEnv = () => {
  const envPath = argv.file || ".env";
  const usePkey = argv.pkey;
  const wallet = Wallet.createRandom();
  console.log(
    `initializing ${chalk.cyan("cinderlink")} .env at ${chalk.yellow(envPath)}`
  );
  fs.writeFileSync(
    envPath,
    usePkey
      ? `CINDERLINK_PRIVATE_KEY=${wallet.privateKey}`
      : `CINDERLINK_MNEMONIC=${wallet.mnemonic.phrase}`
  );
};

if (command === "init") {
  const usePkey = argv.pkey;
  const env = argv.env;
  if (env) {
    initEnv();
  }

  console.log(
    `initializing ${chalk.cyan("cinderlink")} at ${chalk.yellow(configPath)}`
  );
  fs.writeFileSync(
    configPath,
    `import { SocialSyncConfig } from "@cinderlink/plugin-social-core";
import dotenv from "dotenv";
dotenv.config({ path: "${typeof env === "string" ? env : ".env"}" });
export default {
  app: "candor.social",
  ${
    usePkey
      ? `privateKey: process.env.CINDERLINK_PRIVATE_KEY`
      : `mnemonic: process.env.CINDERLINK_MNEMONIC`
  },
  accountNonce: 0,
  plugins: [
    [
      "@cinderlink/plugin-sync-db",
      {
        syncing: {
          social: SocialSyncConfig,
        },
      },
    ],
    ["@cinderlink/plugin-social-server"],
    ["@cinderlink/plugin-identity-server"],
    ["@cinderlink/plugin-offline-sync-server"],
  ],
  ipfs: {
    config: {
      Addresses: {
        Swarm: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
        API: ["/ip4/127.0.0.1/tcp/5001"],
        Gateway: ["/ip4/127.0.0.1/tcp/8080"],
      },
      API: {
        HTTPHeaders: {
          "Access-Control-Allow-Origin": ["http://localhost:3000/"],
          "Access-Control-Allow-Methods": ["PUT", "GET", "POST"],
          "Access-Control-Allow-Credentials": ["true"],
        },
      },
      Bootstrap: [],
    },
  },
};`
  );
  process.exit(0);
}

if (command === "env") {
  initEnv();
  process.exit(0);
}

if (command !== "start") {
  console.error(`unknown command ${chalk.yellow(command)}`);
  process.exit(1);
}

(async () => {
  const env = argv.env;
  dotenv.config({ path: env || ".env" });

  const resolvedConfigPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedConfigPath)) {
    console.error(`no config found at ${chalk.yellow(configPath)}`);
    process.exit(1);
  }

  const { default: config } = await import(resolvedConfigPath);
  let wallet: Wallet;

  if (config.privateKey) {
    wallet = new Wallet(config.privateKey);
  } else if (config.mnemonic) {
    wallet = Wallet.fromMnemonic(config.mnemonic);
  } else {
    console.error(
      `no mnemonic or private key found in ${chalk.yellow(configPath)}`
    );
    process.exit(1);
  }

  if (!wallet) {
    console.error(
      `invalid mnemonic or private key in ${chalk.yellow(configPath)}`
    );
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
          } else {
            console.error(
              chalk.red(
                `plugin ${chalk.yellow(pathname)} not found at ${chalk.yellow(
                  dirname
                )}`
              )
            );

            process.exit(1);
          }
        }
      )
    )
  ).filter((p) => !!p);

  console.log(`starting ${chalk.cyan("cinderlink")}...`);
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
    address: wallet.address as `0x${string}`,
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
