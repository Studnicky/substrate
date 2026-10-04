import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `duplicate-subscribe` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace DuplicateSubscribeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'errorName': { 'minLength': 1, 'type': 'string' } },
        'required': ['errorName'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'duplicate-subscribe' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'duplicate-subscribe' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
