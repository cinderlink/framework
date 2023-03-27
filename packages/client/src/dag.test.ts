import { rmSync } from "fs";
import { describe, beforeAll, it, expect, afterAll } from "vitest";
import { CinderlinkClientInterface } from "@cinderlink/core-types";
import { createSeed } from "@cinderlink/identifiers";
import { createClient } from "./create";

let client: CinderlinkClientInterface;
describe("@cinderlink/client/dag", () => {
  beforeAll(async () => {
    rmSync("./dag-test", { recursive: true, force: true });
    const seed = await createSeed("test seed");
    client = await createClient(seed, [], {
      repo: "dag-test",
    });
    await client.start();
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

  afterAll(async () => {
    await client?.stop();
  });
});
