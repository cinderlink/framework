import { CinderlinkClientInterface } from "../client";

export interface IdentityInterface<Document = any> {
  cid: string | undefined;
  document: Document | undefined;
  client: CinderlinkClientInterface<any>;

  resolve(): Promise<{
    cid: string | undefined;
    document: Document | undefined;
  }>;
  resolveLocal(): Promise<{
    cid: string | undefined;
    document: Document | undefined;
  }>;
  resolveIPNS(): Promise<{
    cid: string | undefined;
    document: Document | undefined;
  }>;
  resolveServer(): Promise<{
    cid: string | undefined;
    document: Document | undefined;
  }>;
  save({ cid, document }: { cid: string; document: Document }): Promise<void>;
}
