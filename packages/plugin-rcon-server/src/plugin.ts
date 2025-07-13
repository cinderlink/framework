import { CinderlinkClientInterface, ZodPluginBase, TypedIncomingMessage, EventPayloadType } from "@cinderlink/core-types";

import { WebSocket } from "ws";
import { rconServerSchemas } from "./schemas";

export interface RconServerOptions {
  password: string;
}

export class RconServerPlugin extends ZodPluginBase<typeof rconServerSchemas> {
  rconConnections: Record<string, WebSocket> = {};

  constructor(
    client: CinderlinkClientInterface,
    public options: Record<string, unknown> = {}
  ) {
    super("rconServer", client, rconServerSchemas);
  }
  async start() {
    await this.initializeHandlers();
    this.logger.info("starting rcon server plugin");
    this.started = true;
  }
  
  stop() {
    this.logger.info("rcon server plugin stopped");
    this.started = false;
  }

  // Define typed event handlers using the new type-safe approach
  protected getEventHandlers() {
    return {
      p2p: {
        '/rcon/connect/request': this.onConnectRequest.bind(this)
      }
    };
  }

  onConnectRequest(message: TypedIncomingMessage<EventPayloadType<typeof rconServerSchemas, 'receive', '/rcon/connect/request'>>) {
    const { payload } = message;
    
    if (!message.encrypted) {
      this.logger.warn(
        `received unencrypted rcon connect request from ${message.peer.peerId}`
      );
      return this.send(message.peer.peerId.toString(), "/rcon/connect/response", {
        timestamp: Date.now(),
        requestId: payload.requestId,
        success: false,
        error: "rcon connect request must be encrypted",
      });
    }

    const { requestId, password, uri } = payload;
    if (password !== this.options.password) {
      return this.send(message.peer.peerId.toString(), "/rcon/connect/response", {
        timestamp: Date.now(),
        requestId,
        success: false,
        error: "invalid password",
      });
    }

    if (!uri) {
      return this.send(message.peer.peerId.toString(), "/rcon/connect/response", {
        timestamp: Date.now(),
        requestId,
        success: true,
      });
    }

    if (this.rconConnections[uri]) {
      return this.send(message.peer.peerId.toString(), "/rcon/connect/response", {
        timestamp: Date.now(),
        requestId,
        success: false,
        error: "already connected",
      });
    }

    const ws = new WebSocket(uri);
    ws.on("open", () => {
      this.rconConnections[uri] = ws;
    });

    ws.on("message", (data) => {
      this.logger.debug("received rcon message", { data });
    });

    ws.on("close", () => {
      delete this.rconConnections[uri];
    });

    ws.on("error", (err) => {
      this.logger.error("rcon connection error", {
        uri,
        error: err.message,
        stack: err.stack,
      });
    });

    setTimeout(() => {
      if (!this.rconConnections[uri]) {
        ws.close();
        return this.send(message.peer.peerId.toString(), "/rcon/connect/response", {
          timestamp: Date.now(),
          requestId,
          success: false,
          error: "connection timed out",
        });
      }
      return;
    }, 5000);

    return;
  }
}

export default RconServerPlugin;
