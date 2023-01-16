import { describe, beforeAll, it, expect, afterAll } from "vitest";
import CandorClient from "./client";
import { createClient, createSeed } from "./create";

let client: CandorClient;
describe("@candor/client/dag", () => {
  beforeAll(async () => {
    const seed = await createSeed("test seed");
    client = await createClient(seed);
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

  afterAll(async () => {
    await client.stop();
  });
});
