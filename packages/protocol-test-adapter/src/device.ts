import { TestNetwork } from "./network";
import { TestConnection } from "./connection";

export class TestDevice {
  connections: Record<string, TestConnection> = {};
  constructor(public id: string, private network: TestNetwork) {}
  connect(other: TestDevice) {
    const conn = new TestConnection();
    this.connections[other.id] = conn;
    other.connections[this.id] = conn;
  }

  disconnect(other: TestDevice) {
    this.connections[other.id].close();
    delete this.connections[other.id];
    delete other.connections[this.id];
  }

  connection(id: string) {
    if (!this.connections[id]) {
      const device = this.network.device(id);
      this.connect(device);
    }
    return this.connections[id];
  }

  connectedTo(id: string) {
    return this.connections[id] !== undefined;
  }
}
