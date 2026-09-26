import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace NavigatorCompatEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'deviceMemory': { 'type': 'number' },
      'hardwareConcurrency': { 'type': 'number' },
      'userAgent': { 'type': 'string' },
      'userAgentData': {
        'additionalProperties': false,
        'properties': {
          'platform': { 'type': 'string' }
        },
        'type': 'object'
      }
    },
    'title': 'NavigatorCompat',
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject({ 'title': 'NavigatorCompat', 'type': 'object' } as const, { 'deviceMemory': SchemaNode.defineNumber({ 'type': 'number' } as const), 'hardwareConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const), 'userAgent': SchemaNode.defineString({ 'type': 'string' } as const), 'userAgentData': SchemaNode.defineObject({ 'type': 'object' } as const, { 'platform': SchemaNode.defineString({ 'type': 'string' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
