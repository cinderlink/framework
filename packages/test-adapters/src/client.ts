import Emittery from "emittery";
import { Peerstore } from "./peerstore";
import {
  CinderlinkClientEvents,
  CinderlinkClientInterface,
  DIDDagInterface,
  EncodingOptions,
  IncomingP2PMessage,
  PluginEventDef,
  PluginInterface,
  ProtocolEvents,
  ReceiveEvents,
  SchemaInterface,
  SubscribeEvents,
  OutgoingP2PMessage,
  PluginEventHandler,
  LoggerInterface,
  LogSeverity,
  SubLoggerInterface,
  Log,
} from "@cinderlink/core-types";
import { TestDIDDag } from "./dag";
import { DID } from "dids";

export class TestLogger implements LoggerInterface {
  constructor(public prefix?: string) {}
  clear() {
    console.clear();
  }

  debug(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "debug", message, data);
  }

  error(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "error", message, data);
  }

  getLogCount(): number {
    return 0;
  }

  getLogs() {
    return [];
  }

  info(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "info", message, data);
  }

  log(
    module: string,
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown> | undefined
  ): void {
    console[severity](
      `${
        this.prefix ? `[${this.prefix}] ` : ""
      }${module} ${severity}: ${message}`,
      data
    );
  }

  warn(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "warn", message, data);
  }

  trace(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "trace", message, data);
  }

  modules: string[] = [];

  module(id: string): SubLoggerInterface {
    return new TestSubLogger(this, id);
  }
}

export class TestSubLogger implements SubLoggerInterface {
  constructor(
    public logger: LoggerInterface,
    public module: string,
    public prefix?: string
  ) {}

  public clear() {
    this.logger.clear(this.module);
  }

  public debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }

  public error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }

  public getLogCount(): number {
    return this.logger.getLogCount(this.module);
  }

  public getLogs(): Log[] {
    return this.logger.getLogs(this.module);
  }

  public info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  public log(
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.logger.log(
      this.module,
      severity,
      this.prefix ? `${this.prefix} - ${message}` : message,
      data
    );
  }

  public trace(message: string, data?: Record<string, unknown>) {
    this.log("trace", message, data);
  }

  public warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  public submodule(prefix: string): SubLoggerInterface {
    return new TestSubLogger(
      this.logger,
      this.module,
      this.prefix ? `${this.prefix}/${prefix}` : prefix
    );
  }
}

export class TestClient<PluginEvents extends PluginEventDef>
  extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]>
  implements CinderlinkClientInterface<PluginEvents>
{
  running = false;
  hasServerConnection = false;
  peers = new Peerstore();
  subscriptions: string[] = [];
  relayAddresses: string[] = [];
  pluginEvents = new Emittery<PluginEvents["emit"]>();
  pubsub = new Emittery<SubscribeEvents<PluginEvents>>();
  p2p = new Emittery<ReceiveEvents<PluginEvents & CinderlinkClientEvents>>();
  ipfs = {} as any;
  files = {} as any;
  address = "0x12345" as `0x${string}`;
  addressVerification = "test";
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface> = {};
  identity = {} as any;
  plugins = {} as Record<string, PluginInterface<any, any>>;
  initialConnectTimeout = 1;
  logger: LoggerInterface = new TestLogger();

  constructor(public readonly did: DID) {
    super();
    this.dag = new TestDIDDag(this.did);
  }

  get id() {
    return this.did.id;
  }

  async addPlugin(plugin: PluginInterface<any, any>) {
    this.plugins[plugin.id] = plugin;
    await plugin.start?.();
  }

  getPlugin<T extends PluginInterface<any, any> = PluginInterface<any, any>>(
    id: string
  ): T {
    return this.plugins[id] as T;
  }

  hasPlugin(id: string) {
    return !!this.plugins[id];
  }

  async start() {
    console.info(
      `plugins > ${
        Object.keys(this.plugins).length
      } plugins found: ${Object.keys(this.plugins).join(", ")}`
    );
    console.info(`plugins > initializing message handlers`);
    await Promise.all(
      Object.values(this.plugins).map(async (plugin: PluginInterface<any>) => {
        console.info(`/plugin/${plugin.id} > starting...`, plugin);
        await plugin.start?.();
        console.info(`/plugin/${plugin.id} > registering event handlers...`);
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.pubsub.on(topic, (handler as PluginEventHandler).bind(plugin));
          this.subscribe(topic);
        });

        Object.entries(plugin.p2p).forEach(([topic, handler]) => {
          this.p2p.on(topic, (handler as PluginEventHandler).bind(plugin));
        });

        if (plugin.coreEvents)
          Object.entries(plugin.coreEvents).forEach(([topic, handler]) => {
            this.on(
              topic as keyof CinderlinkClientEvents["emit"],
              (handler as PluginEventHandler).bind(plugin)
            );
          });

        if (plugin.pluginEvents)
          Object.entries(plugin.pluginEvents).forEach(([topic, handler]) => {
            this.pluginEvents.on(
              topic as keyof PluginEvents["emit"],
              (handler as PluginEventHandler).bind(plugin)
            );
          });
      })
    );

    this.running = true;
  }

  async stop() {
    this.running = false;
  }

  async save() {
    return;
  }

  async load() {
    return;
  }

  async connect() {
    this.hasServerConnection = true;
  }

  async send() {}

  async subscribe(_: string) {}

  async unsubscribe() {}

  async publish() {}

  async request<
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, OutTopic, Encoding>,
    options: Encoding = { sign: false, encrypt: false } as Encoding
  ): Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined> {
    console.info("TestClient.request", peerId, message, options);
    return;
  }

  hasSchema(id: string) {
    return !!this.schemas[id];
  }

  getSchema(id: string) {
    return this.schemas[id];
  }

  async addSchema(id: string, schema: SchemaInterface) {
    this.schemas[id] = schema;
  }
}

export default TestClient;
