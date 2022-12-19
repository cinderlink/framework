import { JWE } from "did-jwt";
import { DID } from "dids";
import { CID } from "multiformats";
import * as json from "multiformats/codecs/json";
import { DAGInterface, DIDDagInterface } from "./types";

export class DIDDag implements DIDDagInterface {
  constructor(public did: DID, private dag: DAGInterface) {}

  async store<Data = unknown>(data: Data): Promise<CID | undefined> {
    return this.dag.store(data);
  }

  async load<Data = unknown>(cid: CID): Promise<Data> {
    return this.dag.load(cid);
  }

  async storeEncrypted<Data = unknown>(
    data: Data,
    recipients: string[] = [this.did.id]
  ): Promise<CID | undefined> {
    const encoded = json.encode(data);
    const jwe = await this.did.createJWE(encoded, recipients);
    return this.dag.store(jwe);
  }

  async loadEncrypted(cid: CID): Promise<JWE> {
    return this.dag.load<JWE>(cid);
  }

  async loadDecrypted<Data = unknown>(cid: CID): Promise<Data> {
    const jwe = await this.loadEncrypted(cid);
    const decrypted = await this.did.decryptJWE(jwe);
    const decoded = json.decode<Data>(decrypted);
    return decoded;
  }
}
export default DIDDag;
