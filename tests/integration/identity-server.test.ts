import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@cinderlink/client";
import { ServerLogger } from "@cinderlink/server";
import {
  createSeed,
  createDID,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { CinderlinkClientInterface, ProtocolEvents } from "@cinderlink/core-types";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import IdentityServerPlugin from "@cinderlink/plugin-identity-server";
import { IdentityServerEvents } from "@cinderlink/plugin-identity-server/types";
import { rmSync } from "fs";

// Create client account with viem
const clientPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
const clientAccount = privateKeyToAccount(clientPrivateKey);
const clientWalletClient = createWalletClient({
  account: clientAccount,
  chain: mainnet,
  transport: http(),
});

const clientDID = await createDID(await createSeed("test identity client"));
const clientAV = await signAddressVerification(
  "test",
  clientDID.id,
  clientAccount,
  clientWalletClient
);

const testIdentityDoc = { hello: "world", updatedAt: 1 };
describe("Identity Server Integration", () => {
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
      address: clientAccount.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "identity-server-client",
      },
      logger: new ServerLogger(),
    });

    // Create server account with viem
    const serverPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const serverAccount = privateKeyToAccount(serverPrivateKey);
    const serverWalletClient = createWalletClient({
      account: serverAccount,
      chain: mainnet,
      transport: http(),
    });
    
    const serverDID = await createDID(await createSeed("test identity server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverAccount,
      serverWalletClient
    );
    server = await createClient<ProtocolEvents<IdentityServerEvents>>({
      did: serverDID,
      address: serverAccount.address,
      addressVerification: serverAV,
      role: "server",
      options: {
        repo: "identity-server-server",
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7376", "/ip4/127.0.0.1/tcp/7377/ws"],
            API: "/ip4/127.0.0.1/tcp/7378",
            Gateway: "/ip4/127.0.0.1/tcp/7379",
          },
          Bootstrap: [],
        },
      },
      logger: new ServerLogger(),
    });
    server.initialConnectTimeout = 0;
    await server.addPlugin(new IdentityServerPlugin(server));

    await Promise.all([server.start([]), server.once("/client/ready")]);
    const serverPeer = await server.ipfs.id();
    console.info("server ready");

    await client.start([`/ip4/127.0.0.1/tcp/7377/ws/p2p/${serverPeer.id}`]);
    console.info("client ready");

    testIdentityCid = (
      await client.dag.storeEncrypted(testIdentityDoc)
    )?.toString();
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
    console.info("sending request");
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

    await new Promise((resolve) => setTimeout(resolve, 250));

    const resolved = await client.identity.resolveServer();
    expect(resolved).not.toBeUndefined();
    expect(resolved?.cid).toEqual(testIdentityCid);
  });

  it.skip("should restore identities from a fresh client", async () => {
    await client.identity.save({
      cid: testIdentityCid as any,
      document: testIdentityDoc,
      forceRemote: true,
      forceImmediate: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    await client.stop();

    // wait 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    const clientB = await createClient({
      did: clientDID,
      address: clientAccount.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "identity-server-client-b",
      },
    });
    const serverPeer = await server.ipfs.id();
    await Promise.all([
      clientB.start([
        `/ip4/127.0.0.1/tcp/7377/ws/p2p/${serverPeer.id.toString()}`,
      ]),
      clientB.once("/identity/resolved"),
    ]);

    expect(clientB.identity.hasResolved).to.toBeTruthy();
    expect(clientB.identity.cid).toEqual(testIdentityCid as string);

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