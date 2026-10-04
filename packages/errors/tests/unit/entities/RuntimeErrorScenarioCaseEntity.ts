import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `runtime-error.loop.spec.ts` exercises. */
export namespace RuntimeErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'minLength': 1, 'type': 'string' },
          'hasCause': { 'type': 'boolean' },
          'retryable': { 'type': 'boolean' }
        },
        'required': ['code', 'hasCause', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'causeMessage': { 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'basic' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'hasCause': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    }, ['code', 'hasCause', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'basic' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
