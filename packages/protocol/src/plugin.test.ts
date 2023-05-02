import { rmSync } from "fs";
import { describe, it, afterEach, beforeEach, expect, vi } from "vitest";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "../../identifiers";
import { IdentityServerPlugin } from "../../plugin-identity-server";
import { createClient } from "../../client";
import { ServerLogger } from "../../server";
import * as ethers from "ethers";
import { CinderlinkClientInterface, ProtocolEvents } from "../../core-types";
import CinderlinkProtocolPlugin from "./plugin";

describe("handleProtocol", () => {
  let client: CinderlinkClientInterface<ProtocolEvents>;
  let server: CinderlinkClientInterface<ProtocolEvents>;
  beforeEach(async () => {
    await rmSync("./test-protocol-client", { recursive: true, force: true });
    await rmSync("./test-protocol-server", { recursive: true, force: true });
    const clientWallet = ethers.Wallet.createRandom();
    const clientDID = await createDID(await createSeed("test client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientWallet
    );
    client = await createClient<ProtocolEvents>({
      did: clientDID,
      address: clientWallet.address as `0x${string}`,
      addressVerification: clientAV,
      logger: new ServerLogger(),
      role: "peer",
      options: {
        repo: "test-protocol-client",
      },
    });
    client.initialConnectTimeout = 0;

    const serverWallet = ethers.Wallet.createRandom();
    const serverDID = await createDID(await createSeed("test server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverWallet
    );
    server = await createClient<ProtocolEvents>({
      did: serverDID,
      address: serverWallet.address as `0x${string}`,
      addressVerification: serverAV,
      logger: new ServerLogger(),
      role: "server",
      options: {
        repo: "test-protocol-server",
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7366", "/ip4/127.0.0.1/tcp/7367/ws"],
            API: "/ip4/127.0.0.1/tcp/7368",
            Gateway: "/ip4/127.0.0.1/tcp/7369",
          },
          Bootstrap: [],
        },
      },
    });
    const identity = new IdentityServerPlugin(server as any);
    server.addPlugin(identity);
    server.initialConnectTimeout = 0;

    await Promise.all([server.start([]), server.once("/client/ready")]);
    const serverPeer = await server.ipfs.id();

    client.keepAliveInterval = 100;
    client.keepAliveTimeout = 500;
    client.initialConnectTimeout = 0;
    await Promise.all([
      client.start([serverPeer.addresses[0].toString()]),
      client.once("/server/connect"),
    ]);

    server.getPlugin<CinderlinkProtocolPlugin>(
      "cinderlink"
    ).respondToKeepAlive = false;
    // await client.addPlugin(new ProtocolPlugin(client));
    // await server.addPlugin(new ProtocolPlugin(server));
  });

  it("should timeout peers after 10 seconds of inactivity", async () => {
    const spy = vi.fn();
    client.pluginEvents.on("/cinderlink/keepalive/timeout", spy);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(spy).toHaveBeenCalled();
  });

  afterEach(async () => {
    await server.stop();
    await client.stop();
    await rmSync("./test-protocol-client", { recursive: true, force: true });
    await rmSync("./test-protocol-server", { recursive: true, force: true });
  });
});
