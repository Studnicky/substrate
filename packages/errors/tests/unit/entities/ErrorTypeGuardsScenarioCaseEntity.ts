import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const GUARD_NAMES = [
  'isErrorWithAddress',
  'isErrorWithCode',
  'isErrorWithErrno',
  'isErrorWithHostname',
  'isErrorWithPort',
  'isErrorWithRetryAfter',
  'isErrorWithStatus',
  'isErrorWithStatusCode',
  'isErrorWithSyscall'
] as const;

/** The single scenario case shape `error-type-guards.loop.spec.ts` exercises. */
export namespace ErrorTypeGuardsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'result': { 'type': 'boolean' } },
        'required': ['result'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'error': {
            'oneOf': [
              { 'type': 'string' },
              {
                'additionalProperties': { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] },
                'properties': {},
                'required': [],
                'type': 'object'
              }
            ]
          },
          'guard': { 'enum': GUARD_NAMES }
        },
        'required': ['error', 'guard'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'guard' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'error': SchemaNode.defineOneOf({}, [
        SchemaNode.defineString({ 'type': 'string' } as const),
        SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]), 'patternProperties': {} })
      ]),
      'guard': SchemaNode.defineEnum({}, GUARD_NAMES)
    }, ['error', 'guard'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'guard' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
