import { TestDevice } from "./device";

export class TestNetwork {
  devices: Record<string, TestDevice> = {};
  constructor() {}

  device(id: string) {
    if (!this.devices[id]) {
      this.devices[id] = new TestDevice(id, this);
    }

    return this.devices[id];
  }

  removeDevice(id: string) {
    delete this.devices[id];
  }

  connection(id1: string, id2: string) {
    return this.device(id1).connection(id2);
  }

  connections(id?: string) {
    if (id) {
      return Object.values(this.device(id).connections);
    }

    return Object.values(this.devices)
      .map((device) => device.connections)
      .flat();
  }
}
