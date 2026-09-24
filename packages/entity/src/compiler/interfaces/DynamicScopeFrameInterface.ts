import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** One schema resource's `$dynamicAnchor` bindings, pushed while validating within that resource. */
export interface DynamicScopeFrameInterface {
  readonly 'anchors': ReadonlyMap<string, CompiledNodeInterface>;
}
