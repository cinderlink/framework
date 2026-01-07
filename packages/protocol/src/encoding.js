import * as json from "multiformats/codecs/json";
export async function decodePayload(encoded, did) {
    let payload;
    let senderDid;
    if (encoded.signed) {
        if (!did) {
            throw new Error("DID required to verify JWS");
        }
        const verification = await did
            .verifyJWS(encoded.payload)
            .catch(() => false);
        if (verification && verification.payload) {
            payload = verification.payload;
            senderDid = verification.didResolutionResult.didDocument?.id;
        }
        else {
            throw new Error("Failed to verify JWS");
        }
    }
    else if (encoded.encrypted) {
        if (!did) {
            throw new Error("DID required to decrypt JWE");
        }
        const decrypted = await did.decryptJWE(encoded.payload).catch(() => undefined);
        if (!decrypted) {
            throw new Error("Failed to decrypt JWE");
        }
        payload = json.decode(decrypted);
    }
    else {
        // Plain payload
        payload = encoded.payload;
    }
    return {
        payload,
        signed: encoded.signed,
        encrypted: encoded.encrypted,
        recipients: encoded.recipients,
        sender: senderDid,
    };
}
export async function encodePayload(payload, options = {}) {
    const { sign = false, encrypt = false, recipients, did } = options;
    let encodedPayload;
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
    }
    else if (encrypt) {
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
    }
    else {
        // Plain payload
        encodedPayload = payload;
    }
    return {
        payload: encodedPayload,
        signed,
        encrypted,
        recipients,
    };
}
//# sourceMappingURL=encoding.js.map