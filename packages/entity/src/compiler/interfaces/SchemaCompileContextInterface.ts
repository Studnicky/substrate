import type { CompiledNodeInterface } from './CompiledNodeInterface.js';
import type { SchemaResourceIndexInterface } from './SchemaResourceIndexInterface.js';

/** Compile-time state shared across one schema document's whole compilation. */
export interface SchemaCompileContextInterface {
  /** `true` only when the root schema's own `$schema` dialect names the Format-Assertion vocabulary. */
  readonly 'formatAssertionVocabularyEnabled': boolean;
  /** Keyed by `${resolvedBaseUri}#${fragment}`, global across the root document and every registered remote. */
  readonly 'referenceCache': Map<string, CompiledNodeInterface>;
  readonly 'resourceIndex': SchemaResourceIndexInterface;
  /** `false` when the root schema's own `$schema` dialect declares the Validation vocabulary excluded. */
  readonly 'validationVocabularyEnabled': boolean;
}
