import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Topic map whose `retry:failed` topic carries the failed attempt number. */
export namespace RetryEventTopicsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'retry:failed': {
        'additionalProperties': false,
        'properties': { 'attempt': { 'type': 'number' } },
        'required': ['attempt'],
        'type': 'object'
      }
    },
    'required': ['retry:failed'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'retry:failed': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'attempt': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['attempt'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['retry:failed'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
