import { rmSync } from "fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "./create";
import {
  createSeed,
  createDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import {
  CinderlinkClientInterface,
  PluginInterface,
  PluginEventDef,
  ProtocolEvents,
  EncodingOptions,
  IncomingP2PMessage,
} from "@cinderlink/core-types";
import * as ethers from "ethers";

const response = vi.fn();
interface TestClientEvents extends PluginEventDef {
  send: {
    "/test/request": { message: string };
  };
  receive: {
    "/test/response": { message: string };
  };
}
export class TestClientPlugin implements PluginInterface<TestClientEvents> {
  id = "test-client-plugin";
  constructor(public client: CinderlinkClientInterface) {}

  p2p = {
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
export class TestServerPlugin implements PluginInterface<TestServerEvents> {
  id = "test-server-plugin";
  constructor(public client: CinderlinkClientInterface<TestServerEvents>) {}

  p2p = {
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
        repo: "client-test-client",
      },
    });
    client.initialConnectTimeout = 0;
    client.addPlugin(new TestClientPlugin(client) as any);

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
        repo: "client-test-server",
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7356", "/ip4/127.0.0.1/tcp/7357/ws"],
            API: "/ip4/127.0.0.1/tcp/7358",
            Gateway: "/ip4/127.0.0.1/tcp/7359",
          },
          Bootstrap: [],
        },
      },
    });
    server.initialConnectTimeout = 0;
    server.addPlugin(new TestServerPlugin(server) as any);

    await server.start([]);
    await client.start([]);

    const serverPeer = await server.ipfs.id();
    await client.connect(serverPeer.id);
  });

  it("can execute a request lifecycle", async () => {
    const serverPeer = await server.ipfs.id();
    await client.request<TestClientEvents, "/test/request", "/test/response">(
      serverPeer.id.toString(),
      {
        topic: "/test/request",
        payload: { message: "hello" },
      }
    );

    expect(response).toHaveBeenCalledWith("hello");
  });

  afterAll(async () => {
    await client?.stop();
    await server?.stop();
    rmSync("./client-test-client", { recursive: true, force: true });
    rmSync("./client-test-server", { recursive: true, force: true });
  });
});
