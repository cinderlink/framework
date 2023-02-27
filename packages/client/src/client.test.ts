import { IncomingP2PMessage } from "@candor/core-types/src/p2p";
import { rmSync } from "fs";
import { createSeed } from "./hash";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "./create";
import {
  CandorClientInterface,
  PluginInterface,
  PluginEventDef,
  ProtocolEvents,
  EncodingOptions,
} from "@candor/core-types";
import { CandorProtocolPlugin } from "@candor/protocol";

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
  constructor(public client: CandorClientInterface) {}

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
  constructor(public client: CandorClientInterface) {}

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

describe("CandorClient", () => {
  let client: CandorClientInterface<any>;
  let server: CandorClientInterface<any>;
  beforeAll(async () => {
    await rmSync("./test-client", { recursive: true, force: true });
    await rmSync("./test-server", { recursive: true, force: true });
    server = await createClient(await createSeed("test server"), [], {
      repo: "test-server",
      config: {
        Addresses: {
          Swarm: ["/ip4/127.0.0.1/tcp/7356", "/ip4/127.0.0.1/tcp/7357/ws"],
          API: "/ip4/127.0.0.1/tcp/7358",
          Gateway: "/ip4/127.0.0.1/tcp/7359",
        },
        Bootstrap: [],
      },
    });
    server.addPlugin<ProtocolEvents>(new CandorProtocolPlugin(server));
    server.addPlugin<TestServerEvents>(new TestServerPlugin(server));
    await server.start();

    client = await createClient(
      await createSeed("test client"),
      [(await server.ipfs.id()).addresses[0].toString()],
      {
        repo: "test-client",
      }
    );
    client.addPlugin<ProtocolEvents>(new CandorProtocolPlugin(client));
    client.addPlugin<TestClientEvents>(new TestClientPlugin(client));
    await client.start();
    await client.connect((await server.ipfs.id()).id, "server");
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
    rmSync("./dag-test", { recursive: true, force: true });
  });
});
