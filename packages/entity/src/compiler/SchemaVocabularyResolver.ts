import { Predicates } from '@studnicky/types/browser';

const VALIDATION_VOCABULARY_URI = 'https://json-schema.org/draft/2020-12/vocab/validation';

/** Reads a schema's own `$schema` dialect (from `remoteSchemas`) to decide whether the Validation vocabulary applies. */
export class SchemaVocabularyResolver {
  /** Absent `$schema`, an unresolvable dialect, or no `$vocabulary` at all default to enabled; a `$vocabulary` map that omits the Validation URI does not recognize it, same as listing it `false`. */
  public static isValidationEnabled(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, object | boolean>): boolean {
    if (!Predicates.isRecord(rootSchema)) { return true; }
    const dialect = Reflect.get(rootSchema, '$schema');
    if (!Predicates.isString(dialect)) { return true; }
    const metaschema = remoteSchemas.get(dialect);
    if (!Predicates.isRecord(metaschema)) { return true; }
    const vocabulary = Reflect.get(metaschema, '$vocabulary');
    if (!Predicates.isRecord(vocabulary)) { return true; }
    const result = Reflect.get(vocabulary, VALIDATION_VOCABULARY_URI) === true;
    return result;
  }
}
