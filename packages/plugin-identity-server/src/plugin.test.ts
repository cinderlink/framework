import { rmSync } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "../../client";
import {
  createSeed,
  createDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import {
  CinderlinkClientInterface,
  ProtocolEvents,
} from "@cinderlink/core-types";
import * as ethers from "ethers";
import IdentityServerPlugin from "./plugin";
import { IdentityServerEvents } from "./types";

const clientWallet = ethers.Wallet.createRandom();
const clientDID = await createDID(await createSeed("test client"));
const clientAV = await signAddressVerification(
  "test",
  clientDID.id,
  clientWallet
);

const testIdentityDoc = { hello: "world", updatedAt: 1 };
describe("IdentityServerPlugin", () => {
  let client: CinderlinkClientInterface<any>;
  let server: CinderlinkClientInterface<any>;
  let testIdentityCid: string | undefined = undefined;
  beforeEach(async () => {
    await rmSync("./identity-server-client", { recursive: true, force: true });
    await rmSync("./identity-server-client-b", {
      recursive: true,
      force: true,
    });
    await rmSync("./identity-server-server", { recursive: true, force: true });

    client = await createClient({
      did: clientDID,
      address: clientWallet.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "identity-server-client",
      },
    });
    testIdentityCid = (
      await client.dag.storeEncrypted(testIdentityDoc)
    )?.toString();

    const serverWallet = ethers.Wallet.createRandom();
    const serverDID = await createDID(await createSeed("test server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverWallet
    );
    server = await createClient<ProtocolEvents<IdentityServerEvents>>({
      did: serverDID,
      address: serverWallet.address,
      addressVerification: serverAV,
      role: "server",
      options: {
        repo: "identity-server-server",
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
    server.addPlugin(new IdentityServerPlugin(server) as any);

    await server.start([]);
    const serverPeer = await server.ipfs.id();
    await client.start([
      `/ip4/127.0.0.1/tcp/7357/ws/p2p/${serverPeer.id.toString()}`,
    ]);
  });

  it("should pin identities", async () => {
    const serverPeer = await server.ipfs.id();
    const response = await client.request(serverPeer.id.toString(), {
      topic: "/identity/set/request",
      payload: { requestId: "test", cid: testIdentityCid },
    });

    expect(response).not.toBeUndefined();
    expect(response?.payload).toMatchInlineSnapshot(`
      {
        "requestId": "test",
        "success": true,
      }
    `);
  });

  it("should resolve identities", async () => {
    const serverPeer = await server.ipfs.id();
    await client.request(serverPeer.id.toString(), {
      topic: "/identity/set/request",
      payload: { requestId: "test", cid: testIdentityCid },
    });

    const resolved = await client.identity.resolve();
    expect(resolved).not.toBeUndefined();
    expect(resolved?.cid).toEqual(testIdentityCid);
  });

  it("should restore identities from a fresh client", async () => {
    await client.identity.save({
      cid: testIdentityCid as string,
      document: testIdentityDoc,
    });
    await client.stop();

    const clientB = await createClient({
      did: clientDID,
      address: clientWallet.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "identity-server-client-b",
      },
    });
    const serverPeer = await server.ipfs.id();
    await clientB.start([
      `/ip4/127.0.0.1/tcp/7357/ws/p2p/${serverPeer.id.toString()}`,
    ]);
    const resolved = await clientB.identity.resolve();

    expect(resolved).not.toBeUndefined();
    expect(resolved?.cid).toEqual(testIdentityCid as string);

    await clientB.stop();
  });

  afterEach(async () => {
    if (client.running) {
      await client?.stop();
    }
    await server?.stop();
    rmSync("./identity-server-client", { recursive: true, force: true });
    rmSync("./identity-server-client-b", { recursive: true, force: true });
    rmSync("./identity-server-server", { recursive: true, force: true });
  });
});