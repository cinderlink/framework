import minimist from "minimist";
import { join, dirname } from "path";
import chalk from "chalk";
import { privateKeyToAccount, mnemonicToAccount, generatePrivateKey, generateMnemonic, english } from "viem/accounts";

import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createServer } from "@cinderlink/server";
import {
  createSignerDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { EventEmitter } from "events";
import * as dotenv from "dotenv";

EventEmitter.setMaxListeners(1024);

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

const initEnv = async () => {
  const envPath = argv.file || ".env";
  const usePkey = argv.pkey;
  
  if (usePkey) {
    const privateKey = generatePrivateKey();
    console.log(
      `initializing ${chalk.cyan("cinderlink")} .env at ${chalk.yellow(envPath)}`
    );
    await Bun.write(
      envPath,
      `CINDERLINK_PRIVATE_KEY=${privateKey}`
    );
  } else {
    const mnemonic = generateMnemonic(english);
    console.log(
      `initializing ${chalk.cyan("cinderlink")} .env at ${chalk.yellow(envPath)}`
    );
    await Bun.write(
      envPath,
      `CINDERLINK_MNEMONIC=${mnemonic}`
    );
  }
};

if (command === "init") {
  (async () => {
    const usePkey = argv.pkey;
    const env = argv.env;
    if (env) {
      await initEnv();
    }

  console.log(
    `initializing ${chalk.cyan("cinderlink")} at ${chalk.yellow(configPath)}`
  );
  await Bun.write(
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
        Swarm: ["/ip4/127.0.0.1/tcp/4500", "/ip4/127.0.0.1/tcp/4501/ws"],
        API: ["/ip4/127.0.0.1/tcp/4502"],
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
  })();
}

if (command === "env") {
  (async () => {
    await initEnv();
    process.exit(0);
  })();
}

if (command !== "start") {
  console.error(`unknown command ${chalk.yellow(command)}`);
  process.exit(1);
}

(async () => {
  const env = argv.env;
  dotenv.config({ path: env || ".env" });

  const resolvedConfigPath = join(process.cwd(), configPath);

  if (!(await Bun.file(resolvedConfigPath).exists())) {
    console.error(`no config found at ${chalk.yellow(configPath)}`);
    process.exit(1);
  }

  const { default: config } = await import(resolvedConfigPath);
  let account;

  if (config.privateKey) {
    account = privateKeyToAccount(config.privateKey as `0x${string}`);
  } else if (config.mnemonic) {
    account = mnemonicToAccount(config.mnemonic);
  } else {
    console.error(
      `no mnemonic or private key found in ${chalk.yellow(configPath)}`
    );
    process.exit(1);
  }

  if (!account) {
    console.error(
      `invalid mnemonic or private key in ${chalk.yellow(configPath)}`
    );
    process.exit(1);
  }

  // Create wallet client for signing
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  console.log(`loading ${chalk.cyan("plugins")}...`);
  const plugins = (
    await Promise.all(
      (config.plugins || []).map(
        async ([pathname, options]: [string, Record<string, unknown>]) => {
          // resolve the plugin relative to the config file
          const dirpath = join(
            dirname(configPath),
            "node_modules",
            pathname
          );
          if (await Bun.file(dirpath).exists()) {
            const pkg = join(dirpath, "package.json");
            if (await Bun.file(pkg)) {
              const { main } = JSON.parse(await Bun.file(pkg).text());
              pathname = join(dirpath, main);
            } else {
              pathname = join(dirpath, "index.js");
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
  const { did, signature } = await createSignerDID(
    config.app,
    account,
    walletClient,
    config.accountNonce || 0
  );

  const addressSignature = await signAddressVerification(
    config.app,
    did.id,
    account,
    walletClient
  );

  // log did, address, signature
  const address = account.address;
  console.log(`  ${chalk.gray("DID")}: ${chalk.cyan(did.id)}`);
  console.log(`  ${chalk.gray("address")}: ${chalk.cyan(address)}`);
  console.log(`  ${chalk.gray("signature")}: ${chalk.cyan(signature)}`);
  console.log(
    `  ${chalk.gray("address signature")}: ${chalk.cyan(addressSignature)}`
  );

  const server = await createServer({
    did,
    address: (account.address as `0x${string}`),
    addressVerification: addressSignature,
    plugins,
    nodes: config.nodes,
    options: config.ipfs,
  });
  server.client.initialConnectTimeout = 1;
  await server.start();

  const addrs = server.client.ipfs.libp2p.getMultiaddrs();
  console.info(`listening: ${addrs.map((addr) => addr.toString()).join(", ")}`);

  process.on("SIGINT", async () => {
    console.log(`stopping ${chalk.cyan("cinderlink")}...`);
    await server.stop();
    process.exit(0);
  });
})();
