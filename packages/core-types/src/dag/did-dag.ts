import { JWE } from "did-jwt";
import { DID } from "dids";
import { CID } from "multiformats";
import { DAGInterface, DIDDagInterface } from "./interface";

export class DIDDag implements DIDDagInterface {
  constructor(public did: DID, private dag: DAGInterface) {}

  async store<Data = unknown>(data: Data): Promise<CID | undefined> {
    return this.dag.store(data);
  }

  async load<Data = unknown>(cid: CID): Promise<Data> {
    return this.dag.load<Data>(cid);
  }

  async storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients: string[] = [this.did.id]
  ): Promise<CID | undefined> {
    const jwe = await this.did.createDagJWE(data, recipients);
    return this.dag.store(jwe);
  }

  async loadEncrypted(cid: CID): Promise<JWE> {
    return this.dag.load<JWE>(cid);
  }

  async loadDecrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(cid: CID): Promise<Data> {
    const jwe = await this.loadEncrypted(cid);
    console.info("decrypting JWE", jwe);
    const decrypted = await this.did.decryptDagJWE(jwe);
    return decrypted as Data;
  }
}
export default DIDDag;
