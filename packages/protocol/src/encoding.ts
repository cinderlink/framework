import { DID, VerifyJWSResult, DagJWS } from "dids";

import { JWE } from "did-jwt";
import * as json from "multiformats/codecs/json";
import * as multiformats from "multiformats";
import {
  EncodedProtocolPayload,
  DecodedProtocolPayload,
  EncodingOptions,
  ProtocolRequest,
} from "@cinderlink/core-types";

export async function decodePayload<
  Payload extends ProtocolRequest = ProtocolRequest,
  Encoding extends EncodingOptions = EncodingOptions
>(encoded: EncodedProtocolPayload<Payload, Encoding>, did?: DID): Promise<DecodedProtocolPayload<Payload, Encoding>> {
  let payload: Payload;
  let senderDid: string | undefined;

  if (encoded.signed) {
    if (!did) {
      throw new Error("DID required to verify JWS");
    }
    
    const verification: VerifyJWSResult | false = await did
      .verifyJWS(encoded.payload as DagJWS)
      .catch(() => false);
      
    if (verification && verification.payload) {
      payload = verification.payload as Payload;
      senderDid = verification.didResolutionResult.didDocument?.id;
    } else {
      throw new Error("Failed to verify JWS");
    }
  } else if (encoded.encrypted) {
    if (!did) {
      throw new Error("DID required to decrypt JWE");
    }
    
    const decrypted = await did.decryptJWE(encoded.payload as JWE).catch(() => undefined);
    if (!decrypted) {
      throw new Error("Failed to decrypt JWE");
    }
    
    payload = json.decode(decrypted) as Payload;
  } else {
    // Plain payload
    payload = encoded.payload as Payload;
  }

  return {
    payload,
    signed: encoded.signed,
    encrypted: encoded.encrypted,
    recipients: encoded.recipients,
    sender: senderDid,
  } as DecodedProtocolPayload<Payload, Encoding>;
}

export async function encodePayload<
  Data extends Record<string, unknown> = ProtocolRequest,
  Encoding extends EncodingOptions = EncodingOptions
>(
  payload: Data,
  options: Encoding & { did?: DID } = {} as Encoding & { did?: DID }
): Promise<EncodedProtocolPayload<Data, Encoding>> {
  const { sign = false, encrypt = false, recipients, did } = options;

  let encodedPayload: DagJWS | JWE | Data;
  let signed = false;
  let encrypted = false;

  if (sign && encrypt) {
    throw new Error("Cannot both sign and encrypt in a single operation");
  }

  if (sign) {
    if (!did) {
      throw new Error("DID required for signing");
    }
    
    const jws = await did.createJWS(payload);
    if (!jws) {
      throw new Error("Failed to create JWS signature");
    }
    
    encodedPayload = jws;
    signed = true;
  } else if (encrypt) {
    if (!recipients || recipients.length === 0) {
      throw new Error("Recipients required for encryption");
    }
    if (!did) {
      throw new Error("DID required for encryption");
    }
    
    const jwe = await did.createJWE(json.encode(payload), recipients);
    if (!jwe) {
      throw new Error("Failed to create JWE encryption");
    }
    
    encodedPayload = jwe;
    encrypted = true;
  } else {
    // Plain payload
    encodedPayload = payload;
  }

  return {
    payload: encodedPayload,
    signed,
    encrypted,
    recipients,
  } as EncodedProtocolPayload<Data, Encoding>;
}
