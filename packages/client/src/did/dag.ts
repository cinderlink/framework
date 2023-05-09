import { GetOptions } from "ipfs-core-types/src/root";
import { JWE } from "did-jwt";
import { DID } from "dids";
import { CID } from "multiformats";
import {
  DAGInterface,
  DAGStoreOptions,
  DIDDagInterface,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import { removeUndefined } from "./util";

export class DIDDag implements DIDDagInterface {
  constructor(
    public did: DID,
    private dag: DAGInterface,
    public logger: SubLoggerInterface
  ) {}

  async store<Data = unknown>(
    data: Data,
    options?: DAGStoreOptions
  ): Promise<CID | undefined> {
    this.logger.debug("storing data", { data });
    return this.dag.store(data, options).catch((err: Error) => {
      this.logger.error("failed to store data", { data, err });
      throw new Error("Client DAG failed to store data: " + err.message);
    });
  }

  // Load a DAG from a CID, optionally loading a specific path within that DAG.

  async load<Data = unknown>(
    cid: CID,
    path?: string,
    options: GetOptions & { suppressErrors?: boolean } = {}
  ): Promise<Data | undefined> {
    const loaded = await this.dag
      .load<Data>(cid, path, options)
      .catch((err: Error) => {
        if (!options.suppressErrors) {
          this.logger.error("error occurred during dag load", {
            cid,
            path,
            options,
            err,
            stack: err.stack,
          });
          throw new Error("DAG failed to load data: " + err.message);
        }
        return undefined;
      });
    if (!loaded && !options.suppressErrors) {
      this.logger.error("failed to load data", { cid, path, options });
      throw new Error("Unable to load data");
    }
    return loaded;
  }

  async storeEncrypted<
    Data extends Record<string, unknown> = Record<string, unknown>
  >(
    data: Data,
    recipients: string[] = [this.did.id],
    options?: DAGStoreOptions
  ): Promise<CID | undefined> {
    const jwe = await this.did.createDagJWE(
      removeUndefined(data),
      recipients || [this.did.id]
    );
    if (!jwe) {
      this.logger.error("failed to create jwe", { data, recipients });
      throw new Error("Unable to create JWE");
    }
    this.logger.debug("storing encrypted data", { jwe });
    return this.dag.store(jwe, {
      storeCodec: "dag-jose",
      hashAlg: "sha2-256",
      pin: true,
      ...options,
    });
  }

  async loadEncrypted(
    cid: CID,
    path?: string,
    options: GetOptions = {}
  ): Promise<JWE> {
    const encrypted = await this.dag.load<JWE>(cid, path, options);
    if (!encrypted) {
      this.logger.error("failed to load encrypted data", {
        cid,
        path,
        options,
      });
      throw new Error("Unable to load encrypted data");
    }
    return encrypted;
  }

  async loadDecrypted<Data = Record<string, unknown>>(
    cid: CID,
    path?: string,
    options: GetOptions = {}
  ): Promise<Data | undefined> {
    const jwe = await this.loadEncrypted(cid, path, options);
    if (!jwe) {
      this.logger.error("failed to load encrypted data", {
        cid,
        path,
        options,
      });
      throw new Error("Unable to load JWE");
    }
    const decrypted = await this.did.decryptDagJWE(jwe);
    return decrypted as Data;
  }
}
export default DIDDag;
