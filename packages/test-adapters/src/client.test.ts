import { describe, it, expect, beforeEach } from "vitest";
import { TestClient, TestLogger, TestSubLogger } from "./client.js";
import { DID } from "dids";
import type { PluginInterface, PluginEventDef } from "@cinderlink/core-types";

// Mock DID for testing
const mockDID = {
  id: "did:test:123456789",
  createJWS: () => Promise.resolve({ signatures: [] }),
  verifyJWS: () => Promise.resolve({ payload: {} }),
} as unknown as DID;

describe("TestClient", () => {
  let client: TestClient<PluginEventDef>;

  beforeEach(() => {
    client = new TestClient(mockDID);
  });

  describe("initialization", () => {
    it("should initialize with basic properties", () => {
      expect(client).toBeDefined();
      expect(client.id).toBe("did:test:123456789");
      expect(client.running).toBe(false);
      expect(client.hasServerConnection).toBe(false);
      expect(client.address).toBe("0x12345");
    });

    it("should have working logger", () => {
      expect(client.logger).toBeInstanceOf(TestLogger);
      
      // Test logger functionality
      expect(() => {
        client.logger.info("test", "Test message");
        client.logger.error("test", "Error message");
        client.logger.debug("test", "Debug message");
      }).not.toThrow();
    });

    it("should have schema registry", () => {
      expect(client.schemaRegistry).toBeDefined();
      expect(client.schemaRegistry.hasSchema("test")).toBe(true);
      
      const validation = client.schemaRegistry.validate("test", 1, { data: "test" });
      expect(validation.success).toBe(true);
    });
  });

  describe("plugin management", () => {
    it("should add and manage plugins", async () => {
      const mockPlugin: PluginInterface = {
        id: "test-plugin",
        started: false,
        p2p: {},
        pubsub: {},
        emit: {},
        start: async () => { mockPlugin.started = true; },
        stop: async () => { mockPlugin.started = false; },
      };

      await client.addPlugin(mockPlugin);
      
      expect(client.hasPlugin("test-plugin")).toBe(true);
      expect(client.getPlugin("test-plugin")).toBe(mockPlugin);
      expect(mockPlugin.started).toBe(true);
    });

    it("should start client with plugins", async () => {
      const mockPlugin: PluginInterface = {
        id: "lifecycle-plugin",
        started: false,
        p2p: {},
        pubsub: {},
        emit: {},
        start: async () => { mockPlugin.started = true; },
      };

      await client.addPlugin(mockPlugin);
      await client.start();
      
      expect(client.running).toBe(true);
      expect(mockPlugin.started).toBe(true);
    });

    it("should handle multiple plugins", async () => {
      const plugin1: PluginInterface = {
        id: "plugin-1",
        started: false,
        p2p: {},
        pubsub: {},
        emit: {},
        start: async () => { plugin1.started = true; },
      };

      const plugin2: PluginInterface = {
        id: "plugin-2", 
        started: false,
        p2p: {},
        pubsub: {},
        emit: {},
        start: async () => { plugin2.started = true; },
      };

      await client.addPlugin(plugin1);
      await client.addPlugin(plugin2);
      await client.start();

      expect(client.hasPlugin("plugin-1")).toBe(true);
      expect(client.hasPlugin("plugin-2")).toBe(true);
      expect(plugin1.started).toBe(true);
      expect(plugin2.started).toBe(true);
    });
  });

  describe("lifecycle management", () => {
    it("should handle start and stop", async () => {
      expect(client.running).toBe(false);
      
      await client.start();
      expect(client.running).toBe(true);
      
      client.stop();
      expect(client.running).toBe(false);
    });

    it("should handle connection state", () => {
      expect(client.hasServerConnection).toBe(false);
      
      client.connect();
      expect(client.hasServerConnection).toBe(true);
    });

    it("should handle save and load operations", () => {
      expect(() => {
        client.save();
        client.load();
      }).not.toThrow();
    });
  });

  describe("messaging interface", () => {
    it("should provide messaging methods", () => {
      expect(typeof client.send).toBe("function");
      expect(typeof client.subscribe).toBe("function");
      expect(typeof client.unsubscribe).toBe("function");
      expect(typeof client.publish).toBe("function");
      expect(typeof client.request).toBe("function");
    });

    it("should handle request calls", async () => {
      const result = await client.request("test-peer", {
        topic: "/test/message",
        payload: { data: "test" }
      });
      
      // TestClient returns undefined for request calls
      expect(result).toBeUndefined();
    });
  });

  describe("schema management", () => {
    it("should manage schemas", () => {
      const mockSchema = {
        id: "test-schema",
        version: 1,
        definition: {},
      };

      expect(client.hasSchema("test-schema")).toBe(false);
      
      client.addSchema("test-schema", mockSchema as any);
      expect(client.hasSchema("test-schema")).toBe(true);
      expect(client.getSchema("test-schema")).toBe(mockSchema);
    });
  });
});

describe("TestLogger", () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger("test-prefix");
  });

  it("should create logger with prefix", () => {
    expect(logger.prefix).toBe("test-prefix");
  });

  it("should provide all log methods", () => {
    expect(() => {
      logger.debug("module", "debug message");
      logger.info("module", "info message"); 
      logger.warn("module", "warn message");
      logger.error("module", "error message");
      logger.trace("module", "trace message");
    }).not.toThrow();
  });

  it("should create submodules", () => {
    const subLogger = logger.module("test-module");
    expect(subLogger).toBeInstanceOf(TestSubLogger);
    expect(subLogger.module).toBe("test-module");
  });
});

describe("TestSubLogger", () => {
  let logger: TestLogger;
  let subLogger: TestSubLogger;

  beforeEach(() => {
    logger = new TestLogger();
    subLogger = new TestSubLogger(logger, "test-module");
  });

  it("should create sublogger with module", () => {
    expect(subLogger.module).toBe("test-module");
    expect(subLogger.logger).toBe(logger);
  });

  it("should provide all log methods", () => {
    expect(() => {
      subLogger.debug("debug message");
      subLogger.info("info message");
      subLogger.warn("warn message");
      subLogger.error("error message");
      subLogger.trace("trace message");
    }).not.toThrow();
  });

  it("should create nested submodules", () => {
    const nestedSubLogger = subLogger.submodule("nested");
    expect(nestedSubLogger.module).toBe("test-module");
    expect(nestedSubLogger.prefix).toBe("nested");
  });

  it("should handle deeply nested submodules", () => {
    const nested1 = subLogger.submodule("level1");
    const nested2 = nested1.submodule("level2");
    
    expect(nested2.prefix).toBe("level1/level2");
  });
});