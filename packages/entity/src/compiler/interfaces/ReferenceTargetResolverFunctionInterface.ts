import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** Resolves a `$ref`/`$dynamicRef` string against the calling node's base URI, compiling (or reusing) its target. */
export interface ReferenceTargetResolverFunctionInterface {
  (reference: string): CompiledNodeInterface;
}
