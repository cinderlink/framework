declare module 'protobufjs/minimal.js' {
  export class Reader {
    static create(buffer: Uint8Array): Reader;
    constructor(buffer: Uint8Array);
    pos: number;
    len: number;
    buf: Uint8Array;
    tag(): number;
    uint32(): number;
    uint64(): number;
    bytes(): Uint8Array;
    string(): string;
    bool(): boolean;
    skip(length?: number): Reader;
    skipType(wireType: number): Reader;
  }
  
  export class Writer {
    static create(): Writer;
    constructor();
    len: number;
    head: any;
    tail: any;
    states: any;
    uint32(value: number): Writer;
    bytes(value: Uint8Array): Writer;
    string(value: string): Writer;
    bool(value: boolean): Writer;
    tag(id: number, wireType: number): Writer;
    finish(): Uint8Array;
  }
  
  export const util: any;
}