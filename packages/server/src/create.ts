import type { HeliaInit } from "helia";
import type {
  LogSeverity,
  LoggerInterface,
  PluginConstructor,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import type { DID } from "dids";
import { Libp2pOptions } from "libp2p"; // Import Libp2pOptions
import { SubLogger, createClient } from "@cinderlink/client";
import { CinderlinkServer } from "./server";

export interface CreateServerOptions {
  did: DID;
  address: `0x${string}`;
  addressVerification: string;
  plugins?: [PluginConstructor<any>, Record<string, unknown>][];
  nodes?: string[]; // Peer multiaddrs
  libp2pOptions?: Partial<Libp2pOptions>;
  heliaOptions?: Partial<HeliaInit>;
}

export class ServerLogger implements LoggerInterface {
  constructor(public prefix?: string) {}
  clear() {
    console.clear();
  }

  debug(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "debug", message, data);
  }

  error(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "error", message, data);
  }

  getLogCount(): number {
    return 0;
  }

  getLogs() {
    return [];
  }

  info(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "info", message, data);
  }

  log(
    module: string,
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown> | undefined
  ): void {
    console[severity](
      `${
        this.prefix ? `[${this.prefix}] ` : ""
      }${module} ${severity}: ${message}`,
      data
    );
  }

  warn(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "warn", message, data);
  }

  trace(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "trace", message, data);
  }

  modules: string[] = [];

  module(id: string): SubLoggerInterface {
    return new SubLogger(this, id);
  }
}

export async function createServer({
  did,
  address,
  addressVerification,
  plugins = [],
  nodes = [], // These are still peer multiaddrs for the client to know about
  libp2pOptions = {},
  heliaOptions = {},
}: CreateServerOptions) {
  const client = await createClient({
    did,
    address,
    addressVerification,
    nodes, // Pass nodes for peer management
    libp2pOptions,
    heliaOptions,
    role: "server",
    logger: new ServerLogger(),
  });
  await Promise.all(
    plugins.map(async ([Plugin, pluginOptions]) => {
      await client.addPlugin(new Plugin(client, pluginOptions));
    })
  );
  return new CinderlinkServer(client);
}
