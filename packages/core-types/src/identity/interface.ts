import { CinderlinkClientInterface } from "../client";
import { IdentityResolved } from "./types";

export interface IdentityInterface<Document = any> {
  cid: string | undefined;
  document: Document | undefined;
  client: CinderlinkClientInterface<any>;
  hasResolved: boolean;

  resolve(): Promise<IdentityResolved>;
  resolveLocal(): Promise<IdentityResolved>;
  resolveIPNS(): Promise<IdentityResolved>;
  resolveServer(): Promise<IdentityResolved>;
  save({ cid, document }: { cid: string; document: Document }): Promise<void>;
}
