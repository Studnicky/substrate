import type {
  EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Serializable browser persistence selection. */
export namespace BrowserPersistenceOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'storageTarget': {
        'enum': ['indexedDb', 'localStorage', 'memory', 'sessionStorage'],
        'type': 'string'
      }
    },
    'required': ['storageTarget'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'storageTarget': SchemaNode.defineEnum({}, ['indexedDb', 'localStorage', 'memory', 'sessionStorage'] as const) }, ['storageTarget'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
