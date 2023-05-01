import chalk from "chalk";
import minimist from "minimist";
import dotenv from "dotenv";
import { mnemonicToAccount, english, generateMnemonic } from "viem/accounts";
import {
  CinderlinkCredentials,
  createIdentity,
  createListenerId,
} from "@cinderlink/websocket-client/src";
import { CinderlinkWebsocketServer } from "./server";

dotenv.config();

const cli = minimist(process.argv.slice(2));
const [command, ...args] = cli._;

function header() {
  console.log(chalk.yellow.bold("@cinderlink/websocket-server"));
  // cinderlink ASCII logo
  console.log(
    chalk.yellow(`
    ██████╗ ██╗███╗   ██╗██████╗ ███████╗██████╗ ██╗     ██╗███╗   ██╗██╗  ██╗
    ██╔════╝██║████╗  ██║██╔══██╗██╔════╝██╔══██╗██║     ██║████╗  ██║██║ ██╔╝
    ██║     ██║██╔██╗ ██║██║  ██║█████╗  ██████╔╝██║     ██║██╔██╗ ██║█████╔╝ 
    ██║     ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗██║     ██║██║╚██╗██║██╔═██╗ 
    ╚██████╗██║██║ ╚████║██████╔╝███████╗██║  ██║███████╗██║██║ ╚████║██║  ██╗
     ╚═════╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
    `)
  );
}

if (command === "create-mnemonic") {
  const mnemonic = generateMnemonic(english);
  header();
  console.log(chalk.greenBright(" mnemonic: "));
  console.log(`    ${chalk.blueBright(mnemonic)}`);
} else if (command === "version" || cli.version) {
  header();
  console.log(chalk.greenBright(" version: 0.0.1 "));
} else if ([undefined, "help"].includes(command)) {
  header();
  console.log(chalk.greenBright.bold(" Commands: "));
  console.log(chalk.blueBright("  create-mnemonic"));
  console.log(chalk.blueBright("  version"));
  console.log(chalk.blueBright("  help"));
} else if (command === "start") {
  if (!process.env.CL_SERVER_MNEMONIC) {
    header();
    console.log(chalk.red("No mnemonic found in environment"));
    console.log(
      chalk.red(
        `Please set ${chalk.yellow("CL_SERVER_MNEMONIC")} to a valid mnemonic`
      )
    );
    console.log();
    console.log(chalk.yellow("You can generate a mnemonic with the command:"));
    console.log(chalk.greenBright("  cl-server create-mnemonic"));
    console.log();
    process.exit(1);
  }

  if (!process.env.CL_SERVER_USERNAME || !process.env.CL_SERVER_PASSWORD) {
    header();
    console.log(chalk.red("No username or password found in environment"));
    console.log(
      chalk.red(
        `Please set ${chalk.yellow("CL_SERVER_USERNAME")} and ${chalk.yellow(
          "CL_SERVER_PASSWORD"
        )} to valid credentials`
      )
    );
    console.log();
    process.exit(1);
  }

  header();

  console.info(chalk.greenBright("Starting Cinderlink Websocket Server..."));

  const host = cli.host || "localhost";
  const port = cli.port || 42069;
  const uri = `ws://${host}:${port}`;

  const wallet = mnemonicToAccount(process.env.CL_SERVER_MNEMONIC);
  const listenerId = createListenerId([uri], "cinderlink");
  const privateListenerId = createListenerId([uri], wallet.address);
  const user: CinderlinkCredentials = {
    username: process.env.CL_SERVER_USERNAME,
    password: process.env.CL_SERVER_PASSWORD,
  };
  createIdentity(listenerId, user, "hd", wallet).then((identity) => {
    const server = new CinderlinkWebsocketServer(identity);
    server.start(port, host);

    console.log();
    console.log(chalk.blueBright("cinderlink server started! 🚀"));
    console.log(
      `\t url: ${chalk.greenBright(
        `ws://${host}:${port}`
      )} \n\t public listenerId: ${chalk.greenBright(
        listenerId
      )} \n\t private listenerId: ${chalk.greenBright(
        privateListenerId
      )} \n\t wallet address: ${chalk.greenBright(wallet.address)}`
    );
  });
} else {
  header();
  console.log(chalk.red(`Unknown command: ${command}`));
}

console.log();

// import { CinderlinkWebsocketServer } from "./server";

// const server = new CinderlinkWebsocketServer();
// server.start();
