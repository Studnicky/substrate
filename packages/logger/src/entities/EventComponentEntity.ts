import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
