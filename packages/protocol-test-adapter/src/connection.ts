import Emittery from "emittery";
import * as json from "multiformats/codecs/json";

interface TestStreamEvents {
  write: Uint8Array;
  abort: any;
  close: undefined;
  unlock: undefined;
  drain: undefined;
}

export class TestConnection {
  out: WritableStream;
  in: ReadableStream;
  emitter: Emittery<TestStreamEvents>;

  closed: boolean = false;

  constructor() {
    this.emitter = new Emittery();
    this.out = new WritableStream({
      start: (controller) => {
        this.emitter.on("abort", (reason) => {
          controller.error(reason);
        });
      },
      write: (chunk) => {
        this.emitter.emit("write", json.encode(chunk));
      },
      abort: (reason) => {
        this.emitter.emit("abort", reason);
      },
      close: () => {
        this.emitter.emit("close");
        this.closed = true;
      },
    });
    this.in = new ReadableStream({
      start: (controller) => {
        this.emitter.on("write", (chunk) => {
          controller.enqueue(json.decode(chunk));
        });
        this.emitter.on("abort", (reason) => {
          controller.error(reason);
        });
        this.emitter.on("close", () => {
          //   controller.close();
        });
      },
      cancel: (reason) => {
        this.emitter.emit("abort", reason);
      },
      pull: (controller) => {
        this.emitter.emit("unlock");

        if (this.closed) {
          controller.close();
        }
      },
    });
  }

  close() {
    this.out.close();
  }

  async *all() {
    const reader = this.in.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  }

  async send(data: any) {
    return this.out.getWriter().write(data);
  }

  async receive() {
    const reader = this.in.getReader();
    const { value, done } = await reader.read();
    if (done) return;
    return value;
  }
}
