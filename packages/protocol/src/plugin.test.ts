import { rmSync } from "fs";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "../../identifiers";
import { createClient } from "../../client";
import * as ethers from "ethers";
import { CinderlinkClientInterface, ProtocolEvents } from "../../core-types";

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
    server.initialConnectTimeout = 0;
    // await client.addPlugin(new ProtocolPlugin(client));
    // await server.addPlugin(new ProtocolPlugin(server));
  });

  it("should handshake on connect", async () => {
    const fnA = vi.fn();
    const fnB = vi.fn();
    client.pluginEvents.on("/cinderlink/handshake/success", fnA);
    server.pluginEvents.on("/cinderlink/handshake/success", fnB);

    await server.start([]);
    const serverPeer = await server.ipfs.id();

    await client.start([serverPeer.addresses[0].toString()]);

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it("should handshake on reconnect", async () => {
    const fnClient = vi.fn();
    const fnServer = vi.fn();
    client.pluginEvents.on("/cinderlink/handshake/success", fnClient);
    server.pluginEvents.on("/cinderlink/handshake/success", fnServer);

    await server.start([]);
    const serverPeer = await server.ipfs.id();

    await client.start([serverPeer.addresses[0].toString()]);

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    await client.ipfs.swarm.disconnect(serverPeer.id);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await client.ipfs.swarm.connect(serverPeer.id);

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    expect(fnClient).toHaveBeenCalledTimes(2);
    expect(fnClient).toHaveBeenCalledTimes(2);
  }, 10000);

  it("should remain authenticated on reconnect", async () => {
    const fnClient = vi.fn();
    const fnServer = vi.fn();

    client.pluginEvents.on("/cinderlink/handshake/success", fnClient);
    server.pluginEvents.on("/cinderlink/handshake/success", fnServer);

    await server.start([]);
    const serverPeer = await server.ipfs.id();

    await client.start([serverPeer.addresses[0].toString()]);
    const clientPeer = await client.ipfs.id();

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    expect(client.peers.getPeer(serverPeer.id.toString())?.authenticated).toBe(
      true
    );
    expect(server.peers.getPeer(clientPeer.id.toString())?.authenticated).toBe(
      true
    );

    await client.ipfs.swarm.disconnect(serverPeer.id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(client.peers.getPeer(serverPeer.id.toString())?.authenticated).toBe(
      false
    );
    expect(server.peers.getPeer(clientPeer.id.toString())?.authenticated).toBe(
      false
    );

    await client.ipfs.swarm.connect(serverPeer.id);

    await Promise.all([
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    expect(fnClient).toHaveBeenCalledTimes(2);
    expect(fnServer).toHaveBeenCalledTimes(2);

    expect(client.peers.getPeer(serverPeer.id.toString())?.authenticated).toBe(
      true
    );
    expect(server.peers.getPeer(clientPeer.id.toString())?.authenticated).toBe(
      true
    );
  }, 10000);

  afterEach(async () => {
    await server.stop();
    await client.stop();
    await rmSync("./test-protocol-client", { recursive: true, force: true });
    await rmSync("./test-protocol-server", { recursive: true, force: true });
  });
});
