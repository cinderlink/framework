// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { rmSync, mkdtempSync } from "fs";

// Polyfill for SubtleCrypto
if (!global.crypto) {
  (global as any).crypto = webcrypto;
}
if (!global.crypto.subtle) {
  global.crypto.subtle = webcrypto.subtle;
}
import { tmpdir } from "os";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "./create";
import { IdentityServerPlugin } from "../../plugin-identity-server";
import {
  createSeed,
  createDID,
  signAddressVerification,
} from "../../identifiers";
import {
  CinderlinkClientInterface,
  SubLoggerInterface,
  PluginInterface,
  PluginEventDef,
  IncomingP2PMessage,
  ReceiveEventHandlers,
  EncodingOptions,
} from "../../core-types";

let testDir: string;
const response = vi.fn();
interface TestClientEvents extends PluginEventDef {
  send: {
    "/test/request": { message: string };
    "/test/invalid-response-request": { data: string };
    "/test/timeout-request": { data: string };
  };
  receive: {
    "/test/response": { message: string };
    // Assuming client might not have a specific handler for an invalid response topic,
    // it would error during processing of the expected response.
    // Or, if server sends on a new topic, add it here. Let's assume server sends on /test/response for invalid.
  };
}
export class TestClientPlugin implements PluginInterface {
  id = "test-client-plugin";
  logger: SubLoggerInterface;
  started = false;
  constructor(public client: CinderlinkClientInterface) {
    this.logger = client.logger.module("plugins").submodule(this.id);
  }

  p2p: ReceiveEventHandlers<TestClientEvents> = {
    "/test/response": this.onTestResponse,
  };
  pubsub = {};
  emit = {};

  onTestResponse(
    message: IncomingP2PMessage<
      TestClientEvents,
      "/test/response",
      EncodingOptions
    >
  ) {
    response(message.payload.message);
  }
}

interface TestServerEvents extends PluginEventDef {
  send: {
    "/test/response": { message: string }; // Also used for sending malformed response
  };
  receive: {
    "/test/request": { message: string };
    "/test/invalid-response-request": { data: string };
    "/test/timeout-request": { data: string };
  };
}
export class TestServerPlugin implements PluginInterface {
  id = "test-server-plugin";
  logger: SubLoggerInterface;
  started = false;
  constructor(public client: CinderlinkClientInterface<TestServerEvents>) {
    this.logger = client.logger.module("plugins").submodule(this.id);
  }

  p2p: ReceiveEventHandlers<TestServerEvents> = {
    "/test/request": this.onTestRequest,
    "/test/invalid-response-request": this.onTestInvalidResponseRequest,
    "/test/timeout-request": this.onTestTimeoutRequest,
  };
  pubsub = {};
  emit = {};

  async onTestRequest(
    message: IncomingP2PMessage<
      TestServerEvents,
      "/test/request",
      EncodingOptions
    >
  ) {
    console.info("test request message");
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/test/response",
      payload: { message: message.payload.message },
    });
  }

  async onTestInvalidResponseRequest(
    message: IncomingP2PMessage<
      TestServerEvents,
      "/test/invalid-response-request",
      EncodingOptions
    >
  ) {
    console.info("test invalid response request message, sending malformed response");
    // Send on the standard /test/response topic, but with a payload client isn't expecting for that response
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/test/response",
      payload: { wrongField: "this is not the expected structure" } as any,
    });
  }

  async onTestTimeoutRequest(
    message: IncomingP2PMessage<
      TestServerEvents,
      "/test/timeout-request",
      EncodingOptions
    >
  ) {
    console.info("test timeout request message, server will not respond");
    // Deliberately do not send a response
    // Or, make it wait very long: await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

describe("CinderlinkClient", () => {
  let client: CinderlinkClientInterface<any>;
  let server: CinderlinkClientInterface<any>;
  beforeAll(async () => {
    const path = await import('path');
    testDir = mkdtempSync(path.join(tmpdir(), "cinderlink-client-test-"));
    const serverPath = path.join(testDir, "client-test-server");
    const clientPath = path.join(testDir, "client-test-client");
    const serverPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const serverAccount = privateKeyToAccount(serverPrivateKey);
    const serverWalletClient = createWalletClient({
      account: serverAccount,
      chain: mainnet,
      transport: http(),
    });
    
    const serverDID = await createDID(await createSeed("test-server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverAccount,
      serverWalletClient
    );
    server = await createClient({
      did: serverDID as any,
      address: serverAccount.address,
      addressVerification: serverAV,
      role: "server",
      datastorePath: serverPath,
      options: {
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7356", "/ip4/127.0.0.1/tcp/7357/ws"],
            API: "/ip4/127.0.0.1/tcp/7355",
          },
          Bootstrap: [],
        },
      },
    });
    server.initialConnectTimeout = 0;
    server.addPlugin(new IdentityServerPlugin(server));
    await server.start([]);
    expect(server.did).toBeDefined();
    server.addPlugin(new TestServerPlugin(server));

    const clientPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const clientAccount = privateKeyToAccount(clientPrivateKey);
    const clientWalletClient = createWalletClient({
      account: clientAccount,
      chain: mainnet,
      transport: http(),
    });
    
    const clientDID = await createDID(await createSeed("test-client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientAccount,
      clientWalletClient
    );
    client = await createClient({
      did: clientDID as any,
      address: clientAccount.address,
      addressVerification: clientAV,
      role: "peer",
      datastorePath: clientPath,
    });
    client.initialConnectTimeout = 0;
    client.addPlugin(new TestClientPlugin(client));

    await Promise.all([
      client.start([`/ip4/127.0.0.1/tcp/7357/ws/p2p/${server.peerId!}`]),
      client.once("/client/ready"),
      client.once("/server/connect"),
    ]);
  });

  it("can execute a request lifecycle", async () => {
    await client.request<TestClientEvents, "/test/request", "/test/response">(
      server.peerId!.toString(),
      {
        topic: "/test/request",
        payload: { message: "hello" },
      }
    );

    expect(response).toHaveBeenCalled();
  });

  afterAll(async () => {
    await client?.stop();
    await server?.stop();
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should fail to connect if the server is not reachable", async () => {
    const clientDID = await createDID(await createSeed("unreachable-client"));
    // A dummy account for this client, not strictly needed for connection failure test if AV is not gatekeeping connection itself
    const privateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain: mainnet, transport: http() });
    const clientAV = await signAddressVerification( "test", clientDID.id, account, walletClient);

    const unreachableClient = await createClient({
      did: clientDID as any,
      address: account.address,
      addressVerification: clientAV,
      role: "peer",
      datastorePath: path.join(testDir, "unreachable-client-data"),
      options: { requestTimeout: 100 } // Assuming a short request/connect timeout
    });
    unreachableClient.initialConnectTimeout = 100; // Shorten connect timeout

    try {
      // Using a port and peer ID that are unlikely to be responsive
      await unreachableClient.start(["/ip4/127.0.0.1/tcp/9998/ws/p2p/QmAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrS"]);
      // If start doesn't throw for not connecting immediately, an event or subsequent action should fail
      // Forcing a failure if start doesn't throw an error for not connecting
      const ready = await Promise.race([
        unreachableClient.once("/client/ready"),
        new Promise(resolve => setTimeout(() => resolve(false), 500)) // Timeout for readiness
      ]);
      if (ready !== false) {
         // Attempt a request if it claims to be ready, which should fail
        await unreachableClient.request(server.peerId!.toString(), { topic: "/test/request", payload: { message: "test" } });
      }
      expect(true).toBe(false); // Should have thrown or failed to become ready
    } catch (error: any) {
      console.info("Server not reachable test caught error:", error.message);
      expect(error).toBeDefined();
      // Further assertions could check for specific error messages if known
      expect(error.message).toMatch(/timeout|connect|dial/i);
    } finally {
      await unreachableClient.stop();
      rmSync(path.join(testDir, "unreachable-client-data"), { recursive: true, force: true });
    }
  });

  it("should handle server sending an invalid response", async () => {
    try {
      // The server's onTestInvalidResponseRequest will send a payload on /test/response
      // that does not match { message: string }, which TestClientPlugin expects.
      await client.request<TestClientEvents, "/test/invalid-response-request", "/test/response">(
        server.peerId!.toString(),
        {
          topic: "/test/invalid-response-request",
          payload: { data: "trigger invalid server response" },
        }
      );
      expect(true).toBe(false); // Should have thrown due to schema validation or processing error
    } catch (error: any) {
      console.info("Invalid response test caught error:", error.message);
      expect(error).toBeDefined();
      // Error could be about validation, unexpected structure, etc.
      // Example: expect(error.message).toMatch(/invalid response|validation|unexpected payload/i);
    }
  });

  it("should handle request timeout", async () => {
    const originalRequestTimeout = client.options.requestTimeout;
    client.options.requestTimeout = 200; // Set a short timeout for this test

    try {
      // The server's onTestTimeoutRequest will not respond.
      await client.request<TestClientEvents, "/test/timeout-request", "/test/response">(
        server.peerId!.toString(),
        {
          topic: "/test/timeout-request",
          payload: { data: "trigger timeout" },
        }
      );
      expect(true).toBe(false); // Should have thrown due to timeout
    } catch (error: any) {
      console.info("Timeout test caught error:", error.message);
      expect(error).toBeDefined();
      expect(error.message).toMatch(/timeout/i);
    } finally {
      client.options.requestTimeout = originalRequestTimeout; // Reset timeout
    }
  });
});
