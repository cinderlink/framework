import { rmSync } from "fs";
import { describe, beforeAll, it, expect, afterAll } from "vitest";
import { CinderlinkClientInterface, ProtocolEvents } from "../../core-types";
import { ethers } from "ethers";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "../../identifiers";
import { createClient } from "./create";

let client: CinderlinkClientInterface<ProtocolEvents>;
describe("@cinderlink/client/dag", () => {
  beforeAll(async () => {
    rmSync("./dag-test", { recursive: true, force: true });
    const clientWallet = ethers.Wallet.createRandom();
    const clientDID = await createDID(await createSeed("dag-test-client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientWallet
    );
    client = await createClient<ProtocolEvents>({
      did: clientDID as any,
      address: clientWallet.address as `0x${string}`,
      addressVerification: clientAV,
      role: "peer",
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
