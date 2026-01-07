export * from "./client/index.js";
export * from "./dag/index.js";
export * from "./ipfs/index.js";
export * from "./p2p/index.js";
export * from "./plugin/index.js";
export * from "./pubsub/index.js";
export * from "./sync/index.js";
export * from "./database/index.js";
export * from "./identity/index.js";
export * from "./protocol/index.js";
export * from "./logger/index.js";

// Explicitly re-export commonly used types to avoid module resolution issues
export type { CinderlinkHelia, IPFSWithLibP2P } from "./ipfs/types.js";
export type { Peer } from "./p2p/types.js";
export type { PluginEventDef, PluginInterface } from "./plugin/types.js";
