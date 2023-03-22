export class Keystore {
  keys: Record<string, Partial<CryptoKeyPair>> = {};
  constructor() {}

  async createKeyPair(id: string) {
    const { subtle } = globalThis.crypto;
    this.keys[id] = await subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      [
        "encrypt",
        "decrypt",
        "sign",
        "verify",
        "deriveKey",
        "deriveBits",
        "wrapKey",
        "unwrapKey",
      ]
    );
    return this.keys[id];
  }

  async getPublicKey(id: string) {
    const { subtle } = globalThis.crypto;
    const key = this.keys[id];
    if (!key.publicKey) {
      throw new Error("Key not found");
    }
    return await subtle.exportKey("jwk", key.publicKey);
  }

  async getPrivateKey(id: string) {
    const { subtle } = globalThis.crypto;
    const key = this.keys[id];
    if (!key.privateKey) {
      throw new Error("Key not found");
    }
    return await subtle.exportKey("jwk", key.privateKey);
  }

  async importPublicKey(id: string, jwk: JsonWebKey) {
    const { subtle } = globalThis.crypto;
    const key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify", "encrypt", "decrypt"]
    );
    this.keys[id] = { publicKey: key };
    return this.keys[id];
  }

  async importPrivateKey(id: string, jwk: JsonWebKey) {
    const { subtle } = globalThis.crypto;
    const key = await subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      [
        "decrypt",
        "encrypt",
        "sign",
        "verify",
        "wrapKey",
        "unwrapKey",
        "deriveKey",
        "deriveBits",
      ]
    );
    this.keys[id] = { privateKey: key };
    return this.keys[id];
  }

  static async sign(key: CryptoKey, data: Uint8Array) {
    const { subtle } = globalThis.crypto;
    return await subtle.sign("ECDSA", key, data);
  }

  static async verify(key: CryptoKey, data: Uint8Array, signature: Uint8Array) {
    const { subtle } = globalThis.crypto;
    return await subtle.verify("ECDSA", key, signature, data);
  }

  static async encrypt(key: CryptoKey, data: Uint8Array) {
    const { subtle } = globalThis.crypto;
    return await subtle.encrypt(
      {
        name: "ECDH",
      },
      key,
      data
    );
  }

  static async decrypt(key: CryptoKey, data: Uint8Array) {
    const { subtle } = globalThis.crypto;
    return await subtle.decrypt(
      {
        name: "ECDH",
      },
      key,
      data
    );
  }
}

export default Keystore;
