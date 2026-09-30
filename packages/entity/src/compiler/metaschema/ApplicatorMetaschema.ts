import { Predicates } from '@studnicky/types/browser';

import { SchemaNodeDefinitionError } from '../../SchemaNodeDefinitionError.js';

/**
 * The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/applicator' metaschema document, carried
 * verbatim from the specification as a string because its own 'then' key is a thenable an object literal may not carry.
 */
const APPLICATOR_DOCUMENT = '{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://json-schema.org/draft/2020-12/meta/applicator","$vocabulary":{"https://json-schema.org/draft/2020-12/vocab/applicator":true},"$dynamicAnchor":"meta","title":"Applicator vocabulary meta-schema","type":["object","boolean"],"properties":{"prefixItems":{"$ref":"#/$defs/schemaArray"},"items":{"$dynamicRef":"#meta"},"contains":{"$dynamicRef":"#meta"},"additionalProperties":{"$dynamicRef":"#meta"},"properties":{"type":"object","additionalProperties":{"$dynamicRef":"#meta"},"default":{}},"patternProperties":{"type":"object","additionalProperties":{"$dynamicRef":"#meta"},"propertyNames":{"format":"regex"},"default":{}},"dependentSchemas":{"type":"object","additionalProperties":{"$dynamicRef":"#meta"},"default":{}},"propertyNames":{"$dynamicRef":"#meta"},"if":{"$dynamicRef":"#meta"},"then":{"$dynamicRef":"#meta"},"else":{"$dynamicRef":"#meta"},"allOf":{"$ref":"#/$defs/schemaArray"},"anyOf":{"$ref":"#/$defs/schemaArray"},"oneOf":{"$ref":"#/$defs/schemaArray"},"not":{"$dynamicRef":"#meta"}},"$defs":{"schemaArray":{"type":"array","minItems":1,"items":{"$dynamicRef":"#meta"}}}}';

class ApplicatorDocument {
  /** Narrows the parsed document rather than asserting it; the string form exists because a 'then' key may not sit in an object literal. */
  public static parse(): { readonly '$id': string } {
    const parsed: unknown = JSON.parse(APPLICATOR_DOCUMENT);
    if (Predicates.isObject(parsed) && typeof parsed.$id === 'string') {
      return { ...parsed, '$id': parsed.$id };
    }
    throw new SchemaNodeDefinitionError('the applicator metaschema document does not carry a string $id');
  }
}

export const APPLICATOR_METASCHEMA: { readonly '$id': string } = ApplicatorDocument.parse();
