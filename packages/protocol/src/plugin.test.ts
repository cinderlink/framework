import { rmSync } from "fs";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { createClient } from "../../client";
import * as ethers from "ethers";
import {
  CinderlinkClientInterface,
  ProtocolEvents,
} from "@cinderlink/core-types";

const fn = vi.fn();

describe("handleProtocol", () => {
  let client: CinderlinkClientInterface<ProtocolEvents>;
  let server: CinderlinkClientInterface<ProtocolEvents>;
  beforeAll(async () => {
    await rmSync("./test-client", { recursive: true, force: true });
    await rmSync("./test-server", { recursive: true, force: true });
    const clientWallet = ethers.Wallet.createRandom();
    const clientDID = await createDID(await createSeed("test client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientWallet
    );
    client = await createClient<ProtocolEvents>({
      did: clientDID,
      address: clientWallet.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "test-client",
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
      address: serverWallet.address,
      addressVerification: serverAV,
      role: "server",
      options: {
        repo: "test-server",
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
    server.initialConnectTimeout = 0;
    // client.addPlugin(new ProtocolPlugin(client) as any);
    // server.addPlugin(new ProtocolPlugin(server) as any);
  });

  it("can send and receive messages", async () => {
    client.pluginEvents.on("/cinderlink/handshake/success", fn);
    server.pluginEvents.on("/cinderlink/handshake/success", fn);

    await server.start([]);
    await client.start([]);

    const serverPeer = await server.ipfs.id();
    await client.connect(serverPeer.id);

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  afterAll(async () => {
    await rmSync("./test-client", { recursive: true, force: true });
    await rmSync("./test-server", { recursive: true, force: true });
  });
});
