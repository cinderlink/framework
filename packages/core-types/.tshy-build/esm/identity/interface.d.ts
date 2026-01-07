import type { CID } from "multiformats";
import { CinderlinkClientInterface } from "../client";
import { IdentityResolved } from "./types";
export interface IdentityInterface<Document = Record<string, unknown>> {
    cid: string | undefined;
    document: Document | undefined;
    client: CinderlinkClientInterface;
    hasResolved: boolean;
    resolving?: Promise<IdentityResolved>;
    resolve(): Promise<IdentityResolved>;
    resolveLocal(): Promise<IdentityResolved>;
    resolveIPNS(): Promise<IdentityResolved>;
    resolveServer(): Promise<IdentityResolved>;
    save({ cid, document, forceRemote, forceImmediate, }: {
        cid: CID;
        document: Document;
        forceRemote?: boolean;
        forceImmediate?: boolean;
    }): Promise<void>;
}
