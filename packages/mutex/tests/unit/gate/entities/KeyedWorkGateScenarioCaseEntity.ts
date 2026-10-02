import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class KeyedWorkGateScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'calls': { 'minimum': 0, 'type': 'number' },
            'coalesceIsInflight': { 'type': 'boolean' },
            'completionOrder': { 'items': { 'type': 'number' }, 'type': 'array' },
            'first': { 'type': 'number' },
            'maximumActive': { 'minimum': 0, 'type': 'number' },
            'mutexIsLocked': { 'type': 'boolean' },
            'order': { 'items': { 'type': 'string' }, 'type': 'array' },
            'rejectedName': { 'minLength': 1, 'type': 'string' },
            'resolved': { 'type': 'number' },
            'result': {},
            'results': { 'items': { 'type': 'number' }, 'type': 'array' },
            'runs': { 'minimum': 0, 'type': 'number' },
            'second': { 'type': 'number' },
            'values': { 'items': { 'type': 'number' }, 'type': 'array' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'config': {
              'additionalProperties': false,
              'properties': {
                'coalesce': {
                  'additionalProperties': false,
                  'properties': { 'timeout': { 'type': 'number' } },
                  'required': ['timeout'],
                  'type': 'object'
                },
                'mutex': {
                  'additionalProperties': false,
                  'properties': { 'timeout': { 'type': 'number' } },
                  'required': ['timeout'],
                  'type': 'object'
                }
              },
              'required': ['coalesce', 'mutex'],
              'type': 'object'
            },
            'delayMs': { 'minimum': 0, 'type': 'number' },
            'key': { 'minLength': 1, 'type': 'string' },
            'key1': { 'minLength': 1, 'type': 'string' },
            'key1DelayMs': { 'minimum': 0, 'type': 'number' },
            'key2': { 'minLength': 1, 'type': 'string' },
            'key2DelayMs': { 'minimum': 0, 'type': 'number' },
            'leaderDelayMs': { 'minimum': 0, 'type': 'number' },
            'serializedDelayMs': { 'minimum': 0, 'type': 'number' },
            'waitBeforeSerializedMs': { 'minimum': 0, 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static node<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'calls': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'coalesceIsInflight': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'completionOrder': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'first': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'maximumActive': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'mutexIsLocked': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'rejectedName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'resolved': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'result': SchemaNode.defineUnknown({} as const),
        'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'runs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'second': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'config': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'coalesce': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeout'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'mutex': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeout'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['coalesce', 'mutex'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'key1': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'key1DelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'key2': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'key2DelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'leaderDelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'serializedDelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'waitBeforeSerializedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The mutex/gate scenario case shape exercises. `result` stays `unknown`:
 * shapes disagree on its runtime type (a number tuple vs. a string), so it cannot be schema-constrained here.
 */
export namespace KeyedWorkGateScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      KeyedWorkGateScenarioBranches.schema('composed-instances'), KeyedWorkGateScenarioBranches.schema('default-serialize-same-key'), KeyedWorkGateScenarioBranches.schema('different-keys-do-not-block'), KeyedWorkGateScenarioBranches.schema('plain-config-single-flight'), KeyedWorkGateScenarioBranches.schema('same-key-serialized-exclusion'), KeyedWorkGateScenarioBranches.schema('single-flight-holds-mutex-against-serialized'), KeyedWorkGateScenarioBranches.schema('single-flight-parses-result'), KeyedWorkGateScenarioBranches.schema('single-flight-reruns-after-settle'), KeyedWorkGateScenarioBranches.schema('single-flight-shares-result')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    KeyedWorkGateScenarioBranches.node('composed-instances'), KeyedWorkGateScenarioBranches.node('default-serialize-same-key'), KeyedWorkGateScenarioBranches.node('different-keys-do-not-block'), KeyedWorkGateScenarioBranches.node('plain-config-single-flight'), KeyedWorkGateScenarioBranches.node('same-key-serialized-exclusion'), KeyedWorkGateScenarioBranches.node('single-flight-holds-mutex-against-serialized'), KeyedWorkGateScenarioBranches.node('single-flight-parses-result'), KeyedWorkGateScenarioBranches.node('single-flight-reruns-after-settle'), KeyedWorkGateScenarioBranches.node('single-flight-shares-result')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
