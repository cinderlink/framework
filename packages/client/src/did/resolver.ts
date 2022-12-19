import KeyResolver from "key-did-resolver";
import type { ResolverRegistry } from "did-resolver";

export const resolver: ResolverRegistry = KeyResolver.getResolver() as any;
export default resolver;
