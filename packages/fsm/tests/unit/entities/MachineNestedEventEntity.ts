import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Event carrying a nested detail record, used to prove history snapshots are deeply isolated. */
export namespace MachineNestedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'details': { 'additionalProperties': false, 'properties': { 'value': { 'type': 'number' } }, 'required': ['value'], 'type': 'object' },
      'type': { 'const': 'toggle', 'type': 'string' }
    },
    'required': ['details', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'details': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'type': SchemaNode.defineConst({}, 'toggle' as const)
  }, ['details', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
