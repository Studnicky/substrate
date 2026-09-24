import { Predicates } from '@studnicky/types/browser';

import { FORMAT_ASSERTION_VOCABULARY_URI, VALIDATION_VOCABULARY_URI } from './constants/VocabularyConstants.js';

/** Reads a schema's own `$schema` dialect (from `remoteSchemas`) to decide which vocabularies apply. */
export class SchemaVocabularyResolver {
  /** Absent `$schema`, an unresolvable dialect, or no `$vocabulary` at all default to enabled; a `$vocabulary` map that omits the Validation URI does not recognize it, same as listing it `false`. */
  public static isValidationEnabled(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): boolean {
    const vocabulary = SchemaVocabularyResolver.resolveVocabulary(rootSchema, remoteSchemas);
    if (vocabulary === undefined) { return true; }
    const result = Reflect.get(vocabulary, VALIDATION_VOCABULARY_URI) === true;
    return result;
  }

  /**
   * Absent `$schema`, an unresolvable dialect, or no `$vocabulary` at all default to disabled — the opposite of
   * Validation's default, since `format` is annotation-only unless a dialect opts into assertion. Once a
   * `$vocabulary` map names the URI at all, an implementation that recognizes it (this one does) ignores the
   * `true`/`false` value; that boolean only governs unknown-vocabulary handling, per the 2020-12 core spec.
   */
  public static isFormatAssertionEnabled(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): boolean {
    const vocabulary = SchemaVocabularyResolver.resolveVocabulary(rootSchema, remoteSchemas);
    if (vocabulary === undefined) { return false; }
    const result = Reflect.has(vocabulary, FORMAT_ASSERTION_VOCABULARY_URI);
    return result;
  }

  private static resolveVocabulary(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): Record<string, unknown> | undefined {
    if (!Predicates.isRecord(rootSchema)) { return undefined; }
    const dialect = Reflect.get(rootSchema, '$schema');
    if (!Predicates.isString(dialect)) { return undefined; }
    const metaschema = remoteSchemas.get(dialect);
    if (!Predicates.isRecord(metaschema)) { return undefined; }
    const vocabulary = Reflect.get(metaschema, '$vocabulary');
    const result = Predicates.isRecord(vocabulary) ? vocabulary : undefined;
    return result;
  }
}
