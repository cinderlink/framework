import { JWE } from "did-jwt";
import { DID } from "dids";
import { CID } from "multiformats";
import { DAGInterface, DIDDagInterface } from "@candor/core-types";

export class DIDDag implements DIDDagInterface {
  constructor(public did: DID, private dag: DAGInterface) {}

  async store<Data = unknown>(data: Data): Promise<CID | undefined> {
    console.info(`client/did/dag/store:`, { data });
    return this.dag.store(data).catch((err) => {
      throw new Error("Client DAG failed to store data: " + err.message);
    });
  }

  async load<Data = unknown>(cid: CID, path?: string): Promise<Data> {
    const loaded = await this.dag.load<Data>(cid, path).catch((err) => {
      throw new Error("Client DAG failed to load data: " + err.message);
    });
    if (!loaded) {
      throw new Error("Unable to load data");
    }
    return loaded;
  }

  async storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients: string[] = [this.did.id]
  ): Promise<CID | undefined> {
    const jwe = await this.did.createDagJWE(data, recipients);
    if (!jwe) {
      throw new Error("Unable to create JWE");
    }
    console.info(`client/did/dag/storeEncrypted:`, { jwe });
    return this.dag.store(jwe);
  }

  async loadEncrypted(cid: CID, path?: string): Promise<JWE> {
    const encrypted = await this.dag.load<JWE>(cid, path);
    if (!encrypted) {
      throw new Error("Unable to load encrypted data");
    }
    return encrypted;
  }

  async loadDecrypted<Data = Record<string, unknown>>(
    cid: CID,
    path?: string
  ): Promise<Data | undefined> {
    const jwe = await this.loadEncrypted(cid, path);
    if (!jwe) {
      throw new Error("Unable to load JWE");
    }
    const decrypted = await this.did.decryptDagJWE(jwe);
    return decrypted as Data;
  }
}
export default DIDDag;
