import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Runtime data-type classification for a discovered property's values. */
export namespace JsonPropertyTypeEntity {
  export const Schema = {
    'enum': ['array', 'boolean', 'date', 'null', 'number', 'object', 'string'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['array', 'boolean', 'date', 'null', 'number', 'object', 'string'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
