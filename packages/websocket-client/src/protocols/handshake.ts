import Emittery from 'emittery';
import { CinderlinkWebSocketClient } from '../client';
import { IncomingProtocolMessage, Peer, ProtocolEvents } from '../types';
import { DagJWS } from 'dids';

export type HandshakeMessage<
  TTopic extends string,
  TPayload extends Record<string, unknown>,
> = IncomingProtocolMessage<'/cinderlink/handshake', TTopic, TPayload>;

export type HandshakeProtocolEvents<TIncoming extends boolean = false> =
  ProtocolEvents<
    'cinderlink/handshake',
    {
      'challenge/issue': { challenge: string };
      'challenge/verified': { did: string };
      'challenge/verify': { challenge: string; signature: DagJWS | string };
    },
    TIncoming
  >;

export function handshakeProtocol(client: CinderlinkWebSocketClient) {
  if (client.protocols.has('cinderlink/handshake')) {
    return;
  }

  let challengeCounter = 0;

  const protocol = new Emittery<HandshakeProtocolEvents<true>>();

  async function onHandshakeChallengeIssue(
    message: HandshakeProtocolEvents<true>['challenge/issue'],
  ) {
    const { peer, payload } = message;
    // we are being issued a challenge, so we need to sign it
    if (!payload.challenge) {
      return;
    }

    const jws = await client.did.createJWS(payload.challenge);
    await client.send(peer.listenerId, {
      protocol: 'cinderlink/handshake',
      topic: 'challenge/verify',
      payload: {
        challenge: payload.challenge,
        signature: jws,
      },
    } as HandshakeProtocolEvents<false>['challenge/verify']);
  }
  protocol.on('challenge/issue', onHandshakeChallengeIssue);

  client.protocols.set('cinderlink/handshake', protocol);

  async function onPeerConnect({ peer }: { peer: Peer }) {
    if (!peer.protocols?.includes('cinderlink/handshake')) {
      return;
    }

    peer.challenge = `cinderlink challenge #${challengeCounter++}, issued at ${Date.now()} by ${
      client.id
    }`;
    peer.challengedAt = Date.now();

    await client.send(peer.listenerId, {
      protocol: 'cinderlink/handshake',
      topic: 'challenge/issue',
      payload: {},
    } as HandshakeProtocolEvents<false>['challenge/issue']);
  }
  client.on('peer/connected', onPeerConnect);

  function challengeTimeoutHandler() {
    client.peers.forEach((peer) => {
      if (peer.challengedAt && Date.now() - peer.challengedAt > 10000) {
        peer.challenge = undefined;
        peer.challengedAt = undefined;
        client
          .send(peer.listenerId, {
            protocol: 'cinderlink/handshake',
            topic: 'challenge/error',
            payload: {
              error: 'Challenge timed out',
            },
          })
          .then(() => {
            peer.io?.in?.close();
            peer.io?.out?.close();
            peer.io = undefined;
          });
      }
    });
  }
  const challengeTimeoutInterval = setInterval(challengeTimeoutHandler, 1000);

  client.on('client/stop', () => {
    clearInterval(challengeTimeoutInterval);
    client.off('peer/connected', onPeerConnect);
  });
}
