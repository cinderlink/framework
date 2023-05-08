import {
  CinderlinkClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  PluginInterface,
  ReceiveEventHandlers,
  SubLoggerInterface,
} from "@cinderlink/core-types";

import { WebSocket } from "ws";

export interface RconServerEvents {
  send: {
    "/rcon/connect/response": {
      requestId: string;
      success: boolean;
      error?: string;
    };
  };
  receive: {
    "/rcon/connect/request": {
      requestId: string;
      password: string;
      uri?: string;
    };
  };
  publish: {};
  subscribe: {};
  emit: {};
}

export interface RconServerOptions {
  password: string;
}

export class RconServerPlugin implements PluginInterface<RconServerEvents> {
  id = "identityServer";
  logger: SubLoggerInterface;
  started = false;
  rconConnections: Record<string, WebSocket> = {};

  constructor(
    public client: CinderlinkClientInterface<RconServerEvents>,
    public options: Record<string, unknown> = {}
  ) {
    this.logger = client.logger.module("plugins").submodule("rconServer");
  }
  async start() {
    this.logger.info("starting rcon server plugin");
    this.started = true;
  }
  async stop() {
    this.logger.info("social server plugin stopped");
    this.started = false;
  }
  p2p: ReceiveEventHandlers<RconServerEvents> = {
    "/rcon/connect/request": this.onConnectRequest.bind(this),
  };
  pubsub = {};
  events = {};

  onConnectRequest(
    message: IncomingP2PMessage<
      RconServerEvents,
      "/rcon/connect/request",
      EncodingOptions
    >
  ) {
    if (!message.encrypted) {
      this.logger.warn(
        `received unencrypted rcon connect request from ${message.peer.peerId}`
      );
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/rcon/connect/response",
        payload: {
          requestId: message.payload.requestId,
          success: false,
          error: "rcon connect request must be encrypted",
        },
      });
    }

    const { requestId, password, uri } = message.payload;
    if (password !== this.options.password) {
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/rcon/connect/response",
        payload: {
          requestId,
          success: false,
          error: "invalid password",
        },
      });
    }

    if (!uri) {
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/rcon/connect/response",
        payload: {
          requestId,
          success: true,
        },
      });
    }

    if (this.rconConnections[uri]) {
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/rcon/connect/response",
        payload: {
          requestId,
          success: false,
          error: "already connected",
        },
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
        return this.client.send(message.peer.peerId.toString(), {
          topic: "/rcon/connect/response",
          payload: {
            requestId,
            success: false,
            error: "connection timed out",
          },
        });
      }
      return;
    }, 5000);

    return;
  }
}

export default RconServerPlugin;
