import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace PlatformInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isAppleSilicon': { 'type': 'boolean' },
      'nodeVersion': { 'type': 'string' },
      'os': { 'type': 'string' }
    },
    'required': ['isAppleSilicon', 'os'],
    'title': 'PlatformInfoType',
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject({ 'title': 'PlatformInfoType', 'type': 'object' } as const, { 'isAppleSilicon': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'nodeVersion': SchemaNode.defineString({ 'type': 'string' } as const), 'os': SchemaNode.defineString({ 'type': 'string' } as const) }, ['isAppleSilicon', 'os'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
