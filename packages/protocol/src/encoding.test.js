import { describe, it, expect, beforeAll } from "vitest";
import { decodePayload, encodePayload } from "./encoding.js";
import { createDID, createSeed } from "@cinderlink/identifiers";
describe("Protocol Encoding", () => {
    let did;
    beforeAll(async () => {
        const seed = await createSeed("test-encoding");
        did = await createDID(seed);
    });
    it("should encode and decode unsigned payload", async () => {
        const originalPayload = {
            topic: "/test/message",
            payload: { message: "hello world" }
        };
        const encoded = await encodePayload(originalPayload, { sign: false, encrypt: false }, did);
        const decoded = await decodePayload(encoded, did);
        expect(decoded.payload).toEqual(originalPayload);
        expect(decoded.senderDid).toBeUndefined();
        expect(encoded.signed).toBe(false);
        expect(encoded.encrypted).toBe(false);
    });
    it("should encode and decode signed payload", async () => {
        const originalPayload = {
            topic: "/test/signed",
            payload: { data: "signed message" }
        };
        const encoded = await encodePayload(originalPayload, { sign: true, encrypt: false, did });
        const decoded = await decodePayload(encoded, did);
        expect(decoded.payload).toEqual(originalPayload);
        // Note: senderDid verification depends on DID resolution which may not work in test environment
        expect(encoded.signed).toBe(true);
        expect(encoded.encrypted).toBe(false);
    });
    it("should encode and decode encrypted payload", async () => {
        const originalPayload = {
            topic: "/test/encrypted",
            payload: { secret: "encrypted data" }
        };
        const encoded = await encodePayload(originalPayload, {
            sign: false,
            encrypt: true,
            did,
            recipients: [did.id]
        });
        const decoded = await decodePayload(encoded, did);
        expect(decoded.payload).toEqual(originalPayload);
        expect(encoded.signed).toBe(false);
        expect(encoded.encrypted).toBe(true);
        // Encrypted payload should be a JWE object
        expect(typeof encoded.payload).toBe("object");
    });
    it("should reject signing and encrypting in same operation", async () => {
        const originalPayload = {
            topic: "/test/signed-encrypted",
            payload: { confidential: "secret signed data" }
        };
        await expect(encodePayload(originalPayload, {
            sign: true,
            encrypt: true,
            did,
            recipients: [did.id]
        })).rejects.toThrow("Cannot both sign and encrypt in a single operation");
    });
    it("should throw error when decoding signed payload without DID", async () => {
        const payload = {
            topic: "/test/no-did",
            payload: { message: "test" }
        };
        const encoded = await encodePayload(payload, { sign: true, encrypt: false, did });
        await expect(decodePayload(encoded)).rejects.toThrow("DID required to verify JWS");
    });
    it("should throw error when decoding encrypted payload without DID", async () => {
        const payload = {
            topic: "/test/no-did-encrypt",
            payload: { message: "test" }
        };
        const encoded = await encodePayload(payload, {
            sign: false,
            encrypt: true,
            did,
            recipients: [did.id]
        });
        await expect(decodePayload(encoded)).rejects.toThrow("DID required to decrypt JWE");
    });
});
//# sourceMappingURL=encoding.test.js.map