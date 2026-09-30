import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** State carrying a nested count record, used to prove interpreter snapshots are isolated. */
export namespace MachineCountingStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'details': { 'additionalProperties': false, 'properties': { 'count': { 'type': 'number' } }, 'required': ['count'], 'type': 'object' },
      'variant': { 'enum': ['idle', 'active'], 'type': 'string' }
    },
    'required': ['details', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'details': SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'variant': SchemaNode.defineEnum({}, ['idle', 'active'] as const) }, ['details', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
