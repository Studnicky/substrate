import type { CompiledNodeInterface } from './CompilerExecutionStateInterface.js';
import type { SchemaResourceIndexInterface } from './SchemaResourceIndexInterface.js';

/** Compile-time state shared across one schema document's whole compilation. */
export interface SchemaCompileContextInterface {
  /** `true` only when the root schema's own `$schema` dialect declares the format-assertion vocabulary at all. */
  readonly 'formatAssertionVocabularyEnabled': boolean;
  /** Keyed by `${resolvedBaseUri}#${fragment}`, global across the root document and every registered remote. */
  readonly 'referenceCache': Map<string, CompiledNodeInterface>;
  /** Every known dialect metaschema, keyed by its `$id` — the vocabulary source for per-resource dialect checks. */
  readonly 'remoteSchemas': ReadonlyMap<string, object | boolean>;
  readonly 'resourceIndex': SchemaResourceIndexInterface;
  /** `false` when the root schema's own `$schema` dialect declares the Validation vocabulary excluded. */
  readonly 'validationVocabularyEnabled': boolean;
}
