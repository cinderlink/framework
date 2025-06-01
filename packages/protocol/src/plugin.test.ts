import { describe, it, afterEach, beforeEach, expect, vi } from "vitest";
import { rmSync } from "fs";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "../../identifiers";
import { IdentityServerPlugin } from "../../plugin-identity-server";
import { createClient } from "../../client";
import { ServerLogger } from "../../server";
import { ethers } from "ethers";
import { CinderlinkClientInterface, ProtocolEvents } from "../../core-types";
import CinderlinkProtocolPlugin from "./plugin";

describe("handleProtocol", () => {
  let client: CinderlinkClientInterface<ProtocolEvents> | undefined;
  let server: CinderlinkClientInterface<ProtocolEvents> | undefined;
  beforeEach(async () => {
    try {
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
        did: clientDID as any,
        address: clientWallet.address as `0x${string}`,
        addressVerification: clientAV,
        logger: new ServerLogger(),
        role: "peer",
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
        did: serverDID as any,
        address: serverWallet.address as `0x${string}`,
        addressVerification: serverAV,
        logger: new ServerLogger(),
        role: "server",
      });
      const identity = new IdentityServerPlugin(server as any);
      server.addPlugin(identity);
      server.addPlugin(new CinderlinkProtocolPlugin(server));
      client.addPlugin(new CinderlinkProtocolPlugin(client));

      await server.start([]);
      const serverPeer = await server.ipfs.id();

      await Promise.all([
        client.start([serverPeer.addresses[0].toString()]),
        client.once("/server/connect"),
      ]);

      server.getPlugin<CinderlinkProtocolPlugin>(
        "cinderlink"
      ).respondToKeepAlive = false;
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });

  it("should timeout peers after 10 seconds of inactivity", async () => {
    if (!client) throw new Error("Client not initialized");
    const spy = vi.fn();
    client.pluginEvents.on("/cinderlink/keepalive/timeout", spy);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    expect(spy).toHaveBeenCalled();
  });

  afterEach(async () => {
    if (server) await server.stop();
    if (client) await client.stop();
    await rmSync("./test-protocol-client", { recursive: true, force: true });
    await rmSync("./test-protocol-server", { recursive: true, force: true });
  });
});
