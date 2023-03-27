import { rmSync } from "fs";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createSeed, createClient } from "../../client/src";
import ProtocolPlugin from "./plugin";
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
    client = await createClient<ProtocolEvents>(
      await createSeed("test client"),
      [],
      {
        repo: "test-client",
      }
    );
    server = await createClient<ProtocolEvents>(
      await createSeed("test server"),
      [],
      {
        repo: "test-server",
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7356", "/ip4/127.0.0.1/tcp/7357/ws"],
            API: "/ip4/127.0.0.1/tcp/7358",
            Gateway: "/ip4/127.0.0.1/tcp/7359",
          },
          Bootstrap: [],
        },
      }
    );
    client.addPlugin<ProtocolEvents>(new ProtocolPlugin(client));
    server.addPlugin<ProtocolEvents>(new ProtocolPlugin(server));
  });

  it("can send and receive messages", async () => {
    client.pluginEvents.on("/cinderlink/handshake/success", fn);
    server.pluginEvents.on("/cinderlink/handshake/success", fn);

    await server.start();
    await client.start();

    const serverPeer = await server.ipfs.id();
    await client.connect(serverPeer.id);

    await client.once("/cinderlink/handshake/success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  afterAll(async () => {
    await rmSync("./test-client", { recursive: true, force: true });
    await rmSync("./test-server", { recursive: true, force: true });
  });
});
