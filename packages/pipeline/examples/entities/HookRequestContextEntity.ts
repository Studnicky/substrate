import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace HookRequestContextEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'elapsed': { 'minimum': 0, 'type': 'number' },
      'headers': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'url': { 'type': 'string' }
    },
    'required': ['headers', 'url'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'elapsed': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'headers': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const), 'patternProperties': {} }), 'url': SchemaNode.defineString({ 'type': 'string' } as const) }, ['headers', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
