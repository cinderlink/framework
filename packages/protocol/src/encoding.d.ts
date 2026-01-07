import { DID } from "dids";
import { EncodedProtocolPayload, DecodedProtocolPayload, EncodingOptions, ProtocolRequest } from "@cinderlink/core-types";
export declare function decodePayload<Payload extends ProtocolRequest = ProtocolRequest, Encoding extends EncodingOptions = EncodingOptions>(encoded: EncodedProtocolPayload<Payload, Encoding>, did?: DID): Promise<DecodedProtocolPayload<Payload, Encoding>>;
export declare function encodePayload<Data extends Record<string, unknown> = ProtocolRequest, Encoding extends EncodingOptions = EncodingOptions>(payload: Data, options?: Encoding & {
    did?: DID;
}): Promise<EncodedProtocolPayload<Data, Encoding>>;
//# sourceMappingURL=encoding.d.ts.map