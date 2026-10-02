import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const beforeAcquireSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': {
        'complete': { 'type': 'boolean' },
        'hookErrorCount': { 'type': 'number' },
        'hookName': { 'const': 'beforeAcquire' },
        'lockedAfterOuterRelease': { 'type': 'boolean' }
      },
      'required': ['complete', 'hookErrorCount', 'hookName', 'lockedAfterOuterRelease'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
      'required': ['key'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'beforeAcquire-reentrant-same-key' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const onReleaseSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': {
        'complete': { 'type': 'boolean' },
        'hookErrorCount': { 'type': 'number' },
        'lockedAfterFirstRelease': { 'type': 'boolean' },
        'lockedAfterSecondRelease': { 'type': 'boolean' },
        'lockedAfterThirdRelease': { 'type': 'boolean' }
      },
      'required': ['complete', 'hookErrorCount', 'lockedAfterFirstRelease', 'lockedAfterSecondRelease', 'lockedAfterThirdRelease'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': {
        'batch': {
          'additionalProperties': false,
          'properties': { 'pendingCount': { 'type': 'number' } },
          'required': ['pendingCount'],
          'type': 'object'
        },
        'key': { 'minLength': 1, 'type': 'string' }
      },
      'required': ['batch', 'key'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'onRelease-reentrant-same-key' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const differentKeysSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': {
        'complete': { 'type': 'boolean' },
        'hookErrorCount': { 'type': 'number' },
        'keys': { 'items': { 'type': 'string' }, 'type': 'array' }
      },
      'required': ['complete', 'hookErrorCount', 'keys'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } },
      'required': ['keys'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'different-keys-unaffected' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

/** The discriminated scenario case shapes `reentrancy.loop.spec.ts` exercises. */
export namespace ReentrancyScenarioCaseEntity {
  export const Schema = { 'oneOf': [beforeAcquireSchema, onReleaseSchema, differentKeysSchema] } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'complete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'hookName': SchemaNode.defineConst({}, 'beforeAcquire' as const),
        'lockedAfterOuterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['complete', 'hookErrorCount', 'hookName', 'lockedAfterOuterRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'beforeAcquire-reentrant-same-key' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'complete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'lockedAfterFirstRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'lockedAfterSecondRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'lockedAfterThirdRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['complete', 'hookErrorCount', 'lockedAfterFirstRelease', 'lockedAfterSecondRelease', 'lockedAfterThirdRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'pendingCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['pendingCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
      }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'onRelease-reentrant-same-key' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'complete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
      }, ['complete', 'hookErrorCount', 'keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'different-keys-unaffected' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
