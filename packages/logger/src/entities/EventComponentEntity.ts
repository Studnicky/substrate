import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
  } as const;

  export const Node = SchemaNode.defineEnum({}, [
    'api', 'auth', 'cache', 'dataSource', 'db', 'entity', 'graph', 'llm',
    'ontology', 'queryPlanner', 'queryRouter', 'queryTranslate', 'schema',
    'timing', 'workflow'
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
