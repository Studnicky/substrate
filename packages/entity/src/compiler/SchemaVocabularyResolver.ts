import { Predicates } from '@studnicky/types/browser';

import { SCHEMA_VOCABULARY_CONSTANTS } from './constants/SchemaVocabularyConstants.js';

/** Reads a schema's own `$schema` dialect (from `remoteSchemas`) to decide which optional vocabularies apply. */
export class SchemaVocabularyResolver {
  /** Absent `$schema`, an unresolvable dialect, or no `$vocabulary` at all default to enabled; a `$vocabulary` map that omits the Validation URI does not recognize it, same as listing it `false`. */
  public static isValidationEnabled(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): boolean {
    const vocabulary = SchemaVocabularyResolver.resolveVocabularyMap(rootSchema, remoteSchemas);
    if (vocabulary === undefined) { return true; }
    const result = Reflect.get(vocabulary, SCHEMA_VOCABULARY_CONSTANTS.validationVocabularyUri) === true;
    return result;
  }

  /**
   * `format` stays an annotation unless the dialect names the format-assertion vocabulary at all — 2020-12 assigns
   * declaring it `true` or `false` the same meaning for a recognizing implementation, only unknown-vocabulary
   * handling reads the boolean. Absent `$schema`, an unresolvable dialect, or no `$vocabulary` default to disabled.
   */
  public static isFormatAssertionEnabled(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): boolean {
    const vocabulary = SchemaVocabularyResolver.resolveVocabularyMap(rootSchema, remoteSchemas);
    if (vocabulary === undefined) { return false; }
    const result = Reflect.has(vocabulary, SCHEMA_VOCABULARY_CONSTANTS.formatAssertionVocabularyUri);
    return result;
  }

  private static resolveVocabularyMap(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): Record<string, unknown> | undefined {
    if (!Predicates.isRecord(rootSchema)) { return undefined; }
    const dialect = Reflect.get(rootSchema, '$schema');
    if (!Predicates.isString(dialect)) { return undefined; }
    const metaschema = remoteSchemas.get(dialect);
    if (!Predicates.isRecord(metaschema)) { return undefined; }
    const vocabulary = Reflect.get(metaschema, '$vocabulary');
    if (!Predicates.isRecord(vocabulary)) { return undefined; }
    return vocabulary;
  }
}
