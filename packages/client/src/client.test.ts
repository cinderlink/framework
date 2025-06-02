import { rmSync } from "fs";
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

const response = vi.fn();
interface TestClientEvents extends PluginEventDef {
  send: {
    "/test/request": { message: string };
  };
  receive: {
    "/test/response": { message: string };
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
    "/test/response": { message: string };
  };
  receive: {
    "/test/request": { message: string };
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
}

describe("CinderlinkClient", () => {
  let client: CinderlinkClientInterface<any>;
  let server: CinderlinkClientInterface<any>;
  beforeAll(async () => {
    await rmSync("./client-test-client", { recursive: true, force: true });
    await rmSync("./client-test-server", { recursive: true, force: true });
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
    rmSync("./client-test-client", { recursive: true, force: true });
    rmSync("./client-test-server", { recursive: true, force: true });
  });
});
