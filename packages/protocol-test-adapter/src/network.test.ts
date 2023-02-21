import { describe, it, expect, beforeEach } from "vitest";
import { TestNetwork } from "./network";
import { TestDevice } from "device";
import { TestConnection } from "connection";

describe("TestNetwork", () => {
  let network: TestNetwork;
  beforeEach(() => {
    network = new TestNetwork();
  });

  it("should create a device", () => {
    const device = network.device("a");
    expect(device).toBeDefined();
  });

  it("should create a connection", () => {
    const conn = network.connection("a", "b");
    expect(conn).toBeDefined();
  });

  it("should create a connection and return the same instance", () => {
    const conn1 = network.connection("a", "b");
    const conn2 = network.connection("a", "b");
    expect(conn1).toBe(conn2);
  });
});

describe("TestDevice", () => {
  let devA: TestDevice;
  let devB: TestDevice;
  beforeEach(() => {
    const network = new TestNetwork();
    devA = network.device("a");
    devB = network.device("b");
  });

  it("should connect to another device", () => {
    devA.connect(devB);
    expect(devA.connectedTo("b")).toBe(true);
    expect(devB.connectedTo("a")).toBe(true);
  });

  it("should disconnect from another device", () => {
    devA.connect(devB);
    devA.disconnect(devB);
    expect(devA.connectedTo("b")).toBe(false);
    expect(devB.connectedTo("a")).toBe(false);
  });

  it("should return a connection", () => {
    devA.connect(devB);
    const conn = devA.connection("b");
    expect(conn).toBeDefined();
  });

  it("should return the same connection", () => {
    devA.connect(devB);
    const conn1 = devA.connection("b");
    const conn2 = devA.connection("b");
    expect(conn1).toBe(conn2);
  });
});

describe("TestConnection", () => {
  let devA: TestDevice;
  let devB: TestDevice;
  let conn: TestConnection;
  beforeEach(() => {
    const network = new TestNetwork();
    devA = network.device("a");
    devB = network.device("b");
    devA.connect(devB);
    conn = devA.connection("b");
  });

  it("should send a message", async () => {
    const message = "hello";
    const received = conn.receive();
    conn.send(message);
    expect(received).resolves.toEqual(message);
  });
});
