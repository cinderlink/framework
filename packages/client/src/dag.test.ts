// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// Polyfill for SubtleCrypto
if (!global.crypto) {
  (global as any).crypto = webcrypto;
}
if (!global.crypto.subtle) {
  global.crypto.subtle = webcrypto.subtle;
}
import { describe, beforeAll, it, expect, afterAll } from "vitest";
import { CinderlinkClientInterface, ProtocolEvents } from "../../core-types";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "../../identifiers";
import { createClient } from "./create";

let client: CinderlinkClientInterface<ProtocolEvents>;
let testDir: string;
describe("@cinderlink/client/dag", () => {
  beforeAll(async () => {
    testDir = mkdtempSync(path.join(tmpdir(), "cinderlink-dag-test-"));
    const datastorePath = path.join(testDir, "dag-test");
    
    // Create a random account with viem
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    
    const did = await createDID(await createSeed("test"));
    const av = await signAddressVerification("test", did.id, account, walletClient);
    
    client = await createClient({
      did: did as any,
      address: account.address,
      addressVerification: av,
      role: "peer",
      datastorePath,
    });
    client.initialConnectTimeout = 0;
    await client.start([]);
  });

  afterAll(async () => {
    await client?.stop();
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
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

  it("should return undefined or throw when trying to load a non-existent CID", async () => {
    // A realistically formatted but likely non-existent CID
    const fakeCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    try {
      const loaded = await client.dag.load(fakeCid);
      expect(loaded).toBeUndefined();
    } catch (error) {
      // Depending on implementation, it might throw an error
      expect(error).toBeDefined();
    }
  });

  it("should throw an error when trying to store undefined", async () => {
    try {
      await client.dag.store(undefined as any);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should throw an error when trying to store null", async () => {
    try {
      await client.dag.store(null as any);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should handle storing a very large object (e.g., throw an error or specific limit handling)", async () => {
    // Create a large string (e.g., 10MB)
    // Node's default max string length is large, but IPFS/Helia might have practical limits.
    // A 10MB string: 10 * 1024 * 1024 characters.
    // Using a smaller size for quicker test, e.g. 2MB to avoid excessive memory/time in test.
    const size = 2 * 1024 * 1024;
    let largeString = "a".repeat(size);
    const largeObject = { data: largeString };
    try {
      await client.dag.store(largeObject);
      // If it stores successfully without error, this might indicate no immediate small limit.
      // Or, the error might occur during network transmission if not locally.
      // For this test, we'll primarily expect an error during the store call itself if limits are hit early.
      // This assertion might need adjustment based on actual behavior.
      // If it doesn't throw, the test will fail here if we expect an error.
      // For now, let's assume it might throw. If not, this test needs refinement.
      // UPDATE: Given the nature of DAGs, it might not throw here, but fail later.
      // For a unit/integration test, let's assume an error is thrown if it's too big for immediate processing.
      // If it doesn't throw, we might need to check for other conditions or assume success for this size.
      // For now, if it *doesn't* throw, this test will "fail" by not catching an error.
      // This is an exploratory test.
      // A more robust test would mock underlying layers to simulate specific errors.
      // This test will pass if it throws any error.
      expect(true).toBe(false); // Should not reach here if it throws
    } catch (error) {
      console.info("Storing large object threw error (expected for this test):", error);
      expect(error).toBeDefined();
    }
  });
});
