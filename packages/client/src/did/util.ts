import type { PeerId } from "@libp2p/interface";
import { keys } from "@libp2p/crypto";
import { encodeDID } from "key-did-provider-ed25519";
import { DID } from "dids";

export function fromPeerId(peerId: PeerId): string {
  if (!peerId?.publicKey) {
    throw new Error("invalid peerId");
  }
  const publicKeyBytes = keys.publicKeyToProtobuf(peerId.publicKey);
  return fromPublicKey(publicKeyBytes.slice(4));
}


export function fromPublicKey(publicKey: Uint8Array) {
  return encodeDID(publicKey);
}

export async function getSignedPayload<T>(payload: any, did: DID) {
  const verify = await did.verifyJWS(payload);
  if (!verify) {
    throw new Error("invalid signature");
  }
  return verify.payload as T;
}

export async function getSigner(payload: any, signer: string, did: DID) {
  const verify = await did.verifyJWS(payload);
  if (!verify) {
    return false;
  }
  return verify.kid === signer;
}

export function removeUndefined<Obj = any>(object: Obj): Obj {
  if (Array.isArray(object)) {
    return object.filter((v) => v !== undefined).map(removeUndefined) as Obj;
  } else if (typeof object === "object") {
    const newObject: Record<string, unknown> = {};
    Object.entries(object as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (typeof value === "object") {
          newObject[key] = removeUndefined(value as Record<string, unknown>);
        } else if (typeof value !== "undefined") {
          newObject[key] = value;
        }
      }
    );
    return newObject as Obj;
  }
  return object;
}
