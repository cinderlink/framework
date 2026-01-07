import type {
  PluginInterface,
  SubLoggerInterface,
  CinderlinkClientInterface,
  PluginEventDef,
  IncomingP2PMessage,
  ReceiveEventHandlers,
  EncodingOptions,
} from "@cinderlink/core-types";
import { vi } from "vitest";

/**
 * Test plugins for client testing
 */

export interface EchoPluginEvents extends PluginEventDef {
  send: {
    "/echo/request": { message: string };
  };
  receive: {
    "/echo/response": { message: string };
  };
}

/**
 * Simple echo plugin for testing P2P communication
 */
export class EchoPlugin implements PluginInterface<EchoPluginEvents> {
  id = "echo-plugin";
  logger: SubLoggerInterface;
  started = false;
  
  // Track method calls for testing
  startCalled = vi.fn();
  stopCalled = vi.fn();
  echoRequestCalled = vi.fn();
  
  constructor(public client: CinderlinkClientInterface<EchoPluginEvents>) {
    this.logger = client.logger.module("plugins").submodule(this.id);
  }
  
  p2p: ReceiveEventHandlers<EchoPluginEvents> = {
    "/echo/request": this.onEchoRequest.bind(this),
  };
  
  pubsub = {};
  pluginEvents = {};
  coreEvents = {};
  
  async start() {
    this.startCalled();
    this.logger.info("Echo plugin starting");
    this.started = true;
  }
  
  async stop() {
    this.stopCalled();
    this.logger.info("Echo plugin stopping");
    this.started = false;
  }
  
  async onEchoRequest(
    message: IncomingP2PMessage<EchoPluginEvents, "/echo/request", EncodingOptions>
  ) {
    this.echoRequestCalled(message);
    this.logger.info("Received echo request", { message: message.payload.message });
    
    // Echo back the message
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/echo/response",
      payload: { message: `Echo: ${message.payload.message}` },
    });
  }
}

export interface TestPubSubEvents extends PluginEventDef {
  subscribe: {
    "test.broadcast": { content: string };
    "test.channel": { data: any };
  };
}

/**
 * PubSub test plugin for testing broadcast functionality
 */
export class PubSubTestPlugin implements PluginInterface<TestPubSubEvents> {
  id = "pubsub-test-plugin";
  logger: SubLoggerInterface;
  started = false;
  
  // Track method calls for testing
  startCalled = vi.fn();
  stopCalled = vi.fn();
  broadcastReceived = vi.fn();
  channelReceived = vi.fn();
  
  constructor(public client: CinderlinkClientInterface<TestPubSubEvents>) {
    this.logger = client.logger.module("plugins").submodule(this.id);
  }
  
  p2p = {};
  
  pubsub = {
    "test.broadcast": this.onBroadcast.bind(this),
    "test.channel": this.onChannel.bind(this),
  };
  
  pluginEvents = {};
  coreEvents = {};
  
  async start() {
    this.startCalled();
    this.logger.info("PubSub test plugin starting");
    this.started = true;
  }
  
  async stop() {
    this.stopCalled();
    this.logger.info("PubSub test plugin stopping");
    this.started = false;
  }
  
  async onBroadcast(message: any) {
    this.broadcastReceived(message);
    this.logger.info("Received broadcast", { content: message.content });
  }
  
  async onChannel(message: any) {
    this.channelReceived(message);
    this.logger.info("Received channel message", { data: message.data });
  }
}

/**
 * Failing plugin for testing error scenarios
 */
export class FailingPlugin implements PluginInterface {
  id = "failing-plugin";
  logger: SubLoggerInterface;
  started = false;
  
  failOnStart: boolean;
  failOnStop: boolean;
  failOnMessage: boolean;
  
  startCalled = vi.fn();
  stopCalled = vi.fn();
  
  constructor(
    public client: CinderlinkClientInterface,
    options: {
      failOnStart?: boolean;
      failOnStop?: boolean;
      failOnMessage?: boolean;
    } = {}
  ) {
    this.logger = client.logger.module("plugins").submodule(this.id);
    this.failOnStart = options.failOnStart ?? false;
    this.failOnStop = options.failOnStop ?? false;
    this.failOnMessage = options.failOnMessage ?? false;
  }
  
  p2p = {
    "/fail/test": this.onFailTest.bind(this),
  };
  
  pubsub = {};
  pluginEvents = {};
  coreEvents = {};
  
  async start() {
    this.startCalled();
    if (this.failOnStart) {
      throw new Error("Plugin failed to start");
    }
    this.started = true;
  }
  
  async stop() {
    this.stopCalled();
    if (this.failOnStop) {
      throw new Error("Plugin failed to stop");
    }
    this.started = false;
  }
  
  async onFailTest() {
    if (this.failOnMessage) {
      throw new Error("Plugin failed to handle message");
    }
  }
}

/**
 * State tracking plugin for testing lifecycle events
 */
export class StateTrackingPlugin implements PluginInterface {
  id = "state-tracking-plugin";
  logger: SubLoggerInterface;
  started = false;
  
  // State tracking
  events: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }> = [];
  
  constructor(public client: CinderlinkClientInterface) {
    this.logger = client.logger.module("plugins").submodule(this.id);
  }
  
  p2p = {};
  pubsub = {};
  pluginEvents = {};
  
  coreEvents = {
    "/client/ready": this.onClientReady.bind(this),
    "/peer/connect": this.onPeerConnect.bind(this),
    "/peer/disconnect": this.onPeerDisconnect.bind(this),
    "/server/connect": this.onServerConnect.bind(this),
  };
  
  async start() {
    this.addEvent("plugin.start");
    this.started = true;
  }
  
  async stop() {
    this.addEvent("plugin.stop");
    this.started = false;
  }
  
  onClientReady() {
    this.addEvent("client.ready");
  }
  
  onPeerConnect(peer: any) {
    this.addEvent("peer.connect", { peerId: peer.peerId?.toString() });
  }
  
  onPeerDisconnect(peer: any) {
    this.addEvent("peer.disconnect", { peerId: peer.peerId?.toString() });
  }
  
  onServerConnect() {
    this.addEvent("server.connect");
  }
  
  private addEvent(type: string, data?: any) {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });
    this.logger.debug("Event tracked", { type, data });
  }
  
  getEvents() {
    return [...this.events];
  }
  
  getEventsByType(type: string) {
    return this.events.filter(e => e.type === type);
  }
  
  clearEvents() {
    this.events = [];
  }
}