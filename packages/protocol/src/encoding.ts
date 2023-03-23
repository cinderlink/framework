import {
  EncodedProtocolPayload,
  DecodedProtocolPayload,
  EncodingOptions,
  ProtocolRequest,
  SignedProtocolPayload,
} from "@cinderlink/core-types";
import * as json from "multiformats/codecs/json";
import { DagJWS, DID, VerifyJWSResult } from "dids";
import { JWE } from "did-jwt";

export async function decodePayload<
  Payload,
  Encoding extends EncodingOptions,
  Encoded extends EncodedProtocolPayload<Payload, Encoding>
>(encoded: Encoded, did?: DID): Promise<DecodedProtocolPayload<Payload>> {
  let payload: DecodedProtocolPayload<Encoded>["payload"];
  let senderDid: string | undefined;
  if (encoded.signed) {
    if (!did) {
      throw new Error("did required to verify JWS");
    }
    // convert array of ints to uint8array
    const verification: VerifyJWSResult | false = await did
      .verifyJWS(encoded.payload as DagJWS)
      .catch(() => false);
    if (verification && verification.payload) {
      console.info("verified JWS", verification.payload);
      payload = verification.payload as Encoded;
      senderDid = verification.didResolutionResult.didDocument?.id;
    } else {
      throw new Error("failed to verify JWS");
    }
  } else if (encoded.encrypted) {
    if (!did) {
      throw new Error("did required to decrypt JWE");
    }
    const decrypted: json.ByteView<Record<string, unknown>> | undefined =
      await did?.decryptJWE(encoded.payload as JWE).catch(() => undefined);
    if (!decrypted) {
      throw new Error("failed to decrypt JWE");
    }
    payload = json.decode(
      decrypted as json.ByteView<DecodedProtocolPayload<Encoded>["payload"]>
    );
  } else {
    payload = (
      encoded as EncodedProtocolPayload<any, { sign: false; encrypt: false }>
    ).payload as DecodedProtocolPayload<Encoded>["payload"];
  }

  return {
    payload: payload as ProtocolRequest,
    signed: encoded.signed,
    encrypted: encoded.encrypted,
    recipients: encoded.recipients,
    ...((senderDid && { sender: senderDid }) || {}),
  } as DecodedProtocolPayload<Payload>;
}

export async function encodePayload<
  Data extends string | Record<string, unknown> = ProtocolRequest,
  Encoding extends EncodingOptions = EncodingOptions
>(
  payload: Data,
  { sign, encrypt, recipients, did }: Encoding & { did?: DID } = {} as Encoding
) {
  let encoded: EncodedProtocolPayload<Data, Encoding>;
  if (sign === true) {
    if (!did) {
      throw new Error("did required to sign payload");
    }
    const jws = await did.createJWS(payload);
    if (!jws) {
      throw new Error("failed to sign payload");
    }
    encoded = {
      payload: jws as SignedProtocolPayload<Data, false>,
      signed: true,
      encrypted: false,
    } as EncodedProtocolPayload<Data, Encoding>;
  } else if (encrypt === true && recipients) {
    if (!did) {
      throw new Error("did required to encrypt payload");
    }
    encoded = {
      payload: await did.createJWE(json.encode(payload), recipients),
      encrypted: true,
      signed: false,
    } as EncodedProtocolPayload<Data, Encoding>;
  } else {
    encoded = {
      payload,
      encrypted: false,
      signed: false,
    } as EncodedProtocolPayload<Data, Encoding>;
  }
  return encoded;
}
