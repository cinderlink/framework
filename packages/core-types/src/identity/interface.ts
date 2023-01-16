import { CandorClientInterface } from "../client";

export interface IdentityInterface<Document = any> {
  cid?: string;
  document?: Document;
  client: CandorClientInterface<any>;

  resolve(): Promise<{ cid?: string; document?: Document }>;
  resolveLocal(): Promise<{ cid?: string; document?: Document }>;
  resolveIPNS(): Promise<{ cid?: string; document?: Document }>;
  resolveServer(): Promise<{ cid?: string; document?: Document }>;
  save({ cid, document }: { cid: string; document: Document }): Promise<void>;
}
