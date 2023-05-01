import * as json from 'multiformats/codecs/json';
import { CinderlinkIdentity, Peer, ProtocolEvents } from './types';
import { MessageEvent, WebSocket } from 'ws';
import { base64url } from 'multiformats/bases/base64';
import { createListenerId, decodeListenerId } from './listenerid';
import Emittery from 'emittery';
import { encodeMessage } from './messages';

interface CinderlinkWebSocketClientEvents {
  'client/error': {
    error: Error;
  };
  'client/start': undefined;
  'client/stop': undefined;
  'peer/connected': {
    peer: Peer;
  };
  'peer/disconnected': {
    peer: Peer;
  };
  'peer/error': {
    error: Error;
    peer: Peer;
  };
}

export class CinderlinkWebSocketClient extends Emittery<CinderlinkWebSocketClientEvents> {
  public peers: Map<string, Peer> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public protocols: Map<string, Emittery<any>> = new Map();

  constructor(
    private identity: CinderlinkIdentity<'wallet' | 'hd' | 'pkey', boolean>,
    public defaultProtocols: string[] = [
      'cinderlink/p2p',
      'cinderlink/relay',
      'cinderlink/pubsub',
      'cinderlink/identity',
    ],
  ) {
    super();
    console.info(
      `websocket/client: created client for ${this.identity.address} with listenerId ${this.identity.listenerId}`,
    );
  }

  get id() {
    return this.identity.id;
  }

  get listenerId() {
    return this.identity.listenerId;
  }

  get address() {
    return this.identity.address;
  }

  get did() {
    return this.identity.did;
  }

  async connectToListenerId(
    id: string,
    address = 'cinderlink',
    protocols: string[] = this.defaultProtocols,
  ) {
    const uris = decodeListenerId(id, address);
    if (uris.length === 0) {
      console.warn(`websocket/client: no uris found for listenerId`, id);
    }

    for (const uri of uris) {
      if (!uri?.length) {
        console.warn(`websocket/client: invalid uri`, uri);
        continue;
      }
      const connected = await this.connectToUri(uri, address, protocols);
      if (connected) {
        return true;
      }
    }

    return false;
  }

  async connectToUri(
    uri: string,
    address?: string,
    protocols: string[] = this.defaultProtocols,
  ) {
    await this.dialUri(uri, address, protocols);
    return this.waitForPeerConnection(createListenerId([uri], address));
  }

  async dialUri(
    uri: string,
    address?: string,
    protocols: string[] = this.defaultProtocols,
  ) {
    if (!uri?.length) {
      throw new Error(`websocket/client: invalid uri`);
    }

    if (this.hasPeerWithUri(uri)) {
      throw new Error(`websocket/client: already connected to ${uri}`);
    }

    console.info(`websocket/client: dialing "${uri}"`);

    const listenerId = createListenerId([uri], address);
    const tokenParams = {
      recipient: listenerId,
      listenerId: this.identity.listenerId,
      did: this.identity.id,
      address: this.identity.address,
      protocols: protocols.join(','),
      timestamp: Date.now().toString(),
    };
    const jws = await this.identity.did.createJWS(tokenParams);
    const token = base64url.encode(json.encode(jws));
    const peer: Peer = {
      listenerId,
      connected: false,
      protocols: [],
      uris: [uri],
      io: {
        out: new WebSocket(uri, {
          headers: {
            'x-cinderlink-token': token,
          },
        }),
      },
    };
    const io = peer.io?.out as WebSocket;
    io.on('message', this.onMessage.bind(this, peer));
    io.on('open', this.onOpen.bind(this, peer));
    io.on('close', this.onClose.bind(this, peer));
    io.on('error', this.onError.bind(this, peer));
    this.peers.set(listenerId, peer);
  }

  getPeerWithUri(uri: string) {
    return Array.from(this.peers.values()).find((peer) =>
      peer.uris.includes(uri),
    );
  }

  hasPeerWithUri(uri: string) {
    return Array.from(this.peers.values()).some((peer) =>
      peer.uris.includes(uri),
    );
  }

  onClose(peer: Peer) {
    console.info(`websocket/client: io.out close`, peer.listenerId);
    peer.connected = false;
    peer.connectedAt = undefined;
    this.emit('peer/connected', { peer });
  }

  onError(peer: Peer, error: Error) {
    console.error(`websocket/client: io.out error`, error);
    peer.connected = false;
    peer.connectedAt = undefined;
    this.emit('peer/error', { peer, error });
  }

  onMessage(peer: Peer, message: MessageEvent) {
    const bytes = message.data as Uint8Array;
    const { protocol, topic, payload } = json.decode(bytes) as {
      payload: Record<string, unknown>;
      protocol: string;
      topic: string;
    };

    if (this.protocols.has(protocol)) {
      console.info(`websocket/client: received message`, {
        protocol,
        topic,
        payload,
      });
      this.protocol<unknown>(protocol)?.emit(topic as keyof unknown, payload);
      const emitter = this.protocols.get(protocol) as Emittery;
      emitter.emit(topic, payload);
      return;
    }

    console.warn(`websocket/client: unsupported protocol`, protocol);
    this.send(peer.listenerId, {
      protocol: 'cinderlink/core',
      topic: 'error',
      payload: {
        error: `unsupported protocol ${protocol}`,
      },
    });
  }

  onOpen(peer: Peer) {
    console.info(`websocket/client: io.out open`, peer.listenerId);
    peer.connected = true;
    peer.connectedAt = Date.now();
    this.emit('peer/connected', { peer });
  }

  protocol<T = unknown>(id: string) {
    if (!this.protocols.has(id)) {
      return undefined;
    }
    return this.protocols.get(id) as Emittery<T>;
  }

  async send<
    TEvents extends ProtocolEvents = ProtocolEvents,
    TTopic extends keyof TEvents = keyof TEvents,
  >(listenerId: string, message: TEvents[TTopic]) {
    if (!this.peers.has(listenerId)) {
      throw new Error(`websocket/client: no peer found for listenerId`);
    }

    const peer = this.peers.get(listenerId) as Peer;
    if (!peer.io?.out) {
      throw new Error(`websocket/client: no io.out found for peer`);
    }

    const bytes = encodeMessage(message);
    await peer.io?.out.send(bytes);
  }

  start() {
    this.emit('client/start');
  }

  stop() {
    this.emit('client/stop');
  }

  async waitForPeerConnection(
    listenerId: string,
    timeout = 10000,
    interval = 50,
  ) {
    if (!this.peers.has(listenerId)) {
      throw new Error(`websocket/client: no peer found for listenerId`);
    }

    const peer = this.peers.get(listenerId) as Peer;
    if (peer.connected) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => {
        reject(
          new Error(
            `websocket/client: timed out waiting for peer connection to ${listenerId}`,
          ),
        );
      }, timeout);

      const _interval = setInterval(() => {
        if (peer.connected) {
          clearTimeout(_timeout);
          clearInterval(_interval);
          resolve(true);
        }
      }, interval);
    });
  }
}
