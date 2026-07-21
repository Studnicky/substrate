import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Valid component prefixes for hierarchical log events. */
export namespace EventComponentEntity {
  export const Schema = {
    'description': 'Valid component prefixes for hierarchical log events.',
    'enum': [
      'api', 'auth', 'cache', 'dataSource', 'db', 'entity', 'graph', 'llm',
      'ontology', 'queryPlanner', 'queryRouter', 'queryTranslate', 'schema',
      'timing', 'workflow'
    ],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
