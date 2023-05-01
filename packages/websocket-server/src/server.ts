import type { DagJWS } from "dids";
import type { Socket } from "net";
import {
  CinderlinkIdentity,
  Peer,
  decodeListenerId,
} from "@cinderlink/websocket-client/src";
import { createServer, type Server, type IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { base64url } from "multiformats/bases/base64";
import * as json from "multiformats/codecs/json";

export class CinderlinkWebsocketServer {
  http: Server;
  wss: WebSocketServer;
  peers: Map<string, Peer> = new Map();
  challengeCounter: number = 0;
  challengeTimeoutInterval: NodeJS.Timer;
  constructor(private identity: CinderlinkIdentity<any, any>) {
    this.http = createServer();
    this.wss = new WebSocketServer({
      noServer: true,
    });
    this.wss.on("connection", this.onConnection.bind(this));
    this.http.on("upgrade", this.onUpgrade.bind(this));
    this.challengeTimeoutInterval = setInterval(
      this.challengeTimeoutHandler.bind(this),
      1000
    );
  }

  async send(
    listenerId: string,
    protocol: string,
    topic: string,
    payload: any
  ) {
    const peer = this.peers.get(listenerId);
    if (!peer) {
      throw new Error(`No peer found for listenerId: ${listenerId}`);
    }

    if (!peer.io?.out) {
      throw new Error(`No outbound socket found for listenerId: ${listenerId}`);
    }

    const message = this.encodeMessage(protocol, topic, payload);
    await peer.io?.out?.send(message);
  }

  encodeMessage(protocol: string, topic: string, payload: Record<string, any>) {
    return json.encode({ protocol, topic, payload });
  }

  challengeTimeoutHandler() {
    this.peers.forEach((peer) => {
      if (peer.challengedAt && Date.now() - peer.challengedAt > 10000) {
        peer.challenge = undefined;
        peer.challengedAt = undefined;
        this.send(peer.listenerId, "cinderlink", "challenge", {
          error: "Challenge timed out",
          success: false,
        }).then(() => {
          peer.io?.in?.close();
          peer.io?.out?.close();
          peer.io = undefined;
        });
      }
    });
  }

  start(port: number = 42069, hostname: string = "localhost") {
    this.http.listen(port, hostname);
  }

  stop() {
    this.wss.close();
    this.http.close();
    clearInterval(this.challengeTimeoutInterval);
  }

  onUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    // console.log("upgrade", request, socket, head);
    this.wss.handleUpgrade(request, socket, head, async (ws) => {
      const token = request.headers["x-cinderlink-token"];
      if (!token) {
        console.warn("Missing x-cinderlink-token header");
        ws.close(4001, "Missing x-cinderlink-token header");
        return;
      }

      const jws: DagJWS = json.decode(base64url.decode(token as string));
      if (!jws) {
        console.warn("Invalid token; no JWS");
        ws.close(4002, "Invalid token; no JWS");
        return;
      }

      const verified = await this.identity.did.verifyJWS(jws);
      if (!verified?.payload) {
        console.warn("Invalid token; no payload");
        ws.close(4002, "Invalid token; no payload");
        return;
      }

      if (verified.kid.split("#")[0] !== verified.payload.did) {
        console.warn(
          `Invalid token; DID mismatch (${verified.kid.split("#")[0]} !== ${
            verified.payload.did
          })`
        );
        ws.close(4003, "Invalid token; DID mismatch");
        return;
      }

      const { did, listenerId, address, recipient, protocols } =
        verified.payload;
      if (recipient !== this.identity.listenerId) {
        console.warn(
          `Invalid token; recipient mismatch (${recipient} !== ${this.identity.listenerId})`
        );
        ws.close(4004, "Invalid token; recipient mismatch");
        return;
      }

      if (!protocols.includes("cinderlink")) {
        console.warn("Invalid token; missing cinderlink protocol");
        ws.close(4005, "Invalid token; missing cinderlink protocol");
        return;
      }

      if (!listenerId) {
        console.warn("Invalid token; missing listenerId");
        ws.close(4006, "Invalid token; missing listenerId");
        return;
      }

      if (!address) {
        console.warn("Invalid token; missing address");
        ws.close(4007, "Invalid token; missing address");
        return;
      }

      const uris = decodeListenerId(listenerId);

      const peer: Peer = {
        did,
        listenerId,
        address,
        protocols,
        uris,
        connected: true,
        connectedAt: Date.now(),
        io: {
          out: ws,
          in: ws,
        },
      };
      this.peers.set(listenerId, peer);
      this.wss.emit("connection", ws, request, { peer });

      peer.challenge = `cinderlink challenge #${this
        .challengeCounter++}, issued at ${Date.now()} by ${this.identity.id}`;
      peer.challengedAt = Date.now();
      const challenge = await this.identity.did.createJWS(peer.challenge);
      this.send(listenerId, "cinderlink", "challenge", challenge).then(() => {
        peer.challengedAt = Date.now();
      });
    });
  }

  onConnection(socket: WebSocket) {
    socket.on("message", this.onMessage);
    socket.on("open", this.onOpen);
  }

  onOpen(...args: any[]) {
    console.log("open", args);
  }

  onMessage(...args: any[]) {
    console.log("message", args);
  }
}
