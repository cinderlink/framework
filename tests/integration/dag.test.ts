import { rmSync } from "fs";
import { describe, beforeAll, it, expect, afterAll } from "vitest";
import { CinderlinkClientInterface, ProtocolEvents } from "@cinderlink/core-types";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { createClient } from "@cinderlink/client";

let client: CinderlinkClientInterface<ProtocolEvents>;
describe("DAG Storage Integration", () => {
  beforeAll(async () => {
    rmSync("./dag-test", { recursive: true, force: true });
    
    // Create a random account with viem
    const privateKey = "0x0123456789012345678901234567890123456789012345678901234567890123" as const;
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    
    const did = await createDID(await createSeed("test"));
    const av = await signAddressVerification("test", did.id, account, walletClient);
    
    client = await createClient({
      did: did,
      address: account.address,
      addressVerification: av,
      role: "peer",
      options: {
        testMode: true,
      },
    });
    client.initialConnectTimeout = 0;
    await client.start([]);
  });

  afterAll(async () => {
    await client?.stop();
    rmSync("./dag-test", { recursive: true, force: true });
  });

  it("should store and load a document", async () => {
    const document = { test: "test" };
    const cid = await client.dag.store(document);
    const loaded = cid ? await client.dag.load(cid) : undefined;
    expect(loaded).toEqual(document);
  });

  it("should store and load an encrypted document", async () => {
    const document = { test: "test" };
    const cid = await client.dag.storeEncrypted(document);
    const loaded = cid ? await client.dag.loadDecrypted(cid) : undefined;
    expect(loaded).toEqual(document);
  });

  it("should store and load an array", async () => {
    const document = { rows: [{ test: "test" }, { test: "test" }] };
    const cid = await client.dag.store(document);
    const loaded = cid ? await client.dag.load(cid) : undefined;
    expect(loaded).toEqual(document);
  });

  it("should store and load an encrypted array", async () => {
    const document = { rows: [{ test: "test" }, { test: "test" }] };
    const cid = await client.dag.storeEncrypted(document);
    const loaded = cid ? await client.dag.loadDecrypted(cid) : undefined;
    console.info(loaded);
    expect(loaded).toEqual(document);
  });
});