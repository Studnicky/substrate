import type { CompiledNodeInterface } from './CompiledNodeInterface.js';

/** Compile-time state shared across one schema document's whole compilation. */
export interface SchemaCompileContextInterface {
  readonly 'referenceCache': Map<string, CompiledNodeInterface>;
  readonly 'rootSchema': unknown;
}
