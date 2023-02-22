import Emittery from "emittery";
import * as json from "multiformats/codecs/json";

interface TestStreamEvents {
  write: Uint8Array;
  abort: any;
  close: undefined;
}

export class TestStream {
  write: WritableStream;
  read: ReadableStream;
  emitter: Emittery<TestStreamEvents>;

  constructor() {
    this.emitter = new Emittery();
    this.write = new WritableStream({
      write: (chunk) => {
        this.emitter.emit("write", json.encode(chunk));
      },
      abort: (reason) => {
        this.emitter.emit("abort", reason);
      },
      close: () => {
        this.emitter.emit("close");
      },
    });
    this.read = new ReadableStream({
      start: (controller) => {
        this.emitter.on("write", (chunk) => {
          controller.enqueue(chunk);
        });
      },
      cancel: (reason) => {
        this.emitter.emit("abort", reason);
      },
    });
  }
}
