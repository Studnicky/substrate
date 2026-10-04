import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class MatchersScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': { 'type': 'boolean' },
          'properties': {},
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'arrayValue': { 'items': { 'type': 'string' }, 'type': 'array' },
            'booleanValue': { 'type': 'boolean' },
            'code': { 'type': 'string' },
            'connectionCode': { 'type': 'string' },
            'constraintCode': { 'type': 'string' },
            'deadlockCode': { 'type': 'string' },
            'errorName': { 'type': 'string' },
            'foreignKeyCode': { 'type': 'string' },
            'numberValue': { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] },
            'objectValue': {},
            'prototypeValue': {},
            'status': { 'type': 'number' },
            'stringValue': { 'type': 'string' }
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

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'arrayValue': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'booleanValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'connectionCode': SchemaNode.defineString({ 'type': 'string' } as const),
        'constraintCode': SchemaNode.defineString({ 'type': 'string' } as const),
        'deadlockCode': SchemaNode.defineString({ 'type': 'string' } as const),
        'errorName': SchemaNode.defineString({ 'type': 'string' } as const),
        'foreignKeyCode': SchemaNode.defineString({ 'type': 'string' } as const),
        'numberValue': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]),
        'objectValue': SchemaNode.defineUnknown({} as const),
        'prototypeValue': SchemaNode.defineUnknown({} as const),
        'status': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'stringValue': SchemaNode.defineString({ 'type': 'string' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The scenario case shape `matchers.loop.spec.ts` exercises across the matcher library.
 *
 * `matchers.scenarios.json` carries `instance-matchers`, `object-matchers`, and
 * `proto-matchers` cases the spec's own runner map never wires up — `assertMatcherSurface`
 * asserts the `instance`/`isType`/`object`/`proto` matchers it would have tested are no longer
 * on the public `matchers` surface at all. This schema still validates them so the fixture
 * file loads honestly, but the spec's `isScenarioCase` guard continues to skip them.
 */
export namespace MatchersScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      MatchersScenarioCaseBuilders.branchSchema('array-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('boolean-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('database-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('empty-variadics'),
      MatchersScenarioCaseBuilders.branchSchema('http-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('immutable-matcher-route'),
      MatchersScenarioCaseBuilders.branchSchema('logic-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('negative-matcher-route'),
      MatchersScenarioCaseBuilders.branchSchema('network-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('number-matchers'),
      MatchersScenarioCaseBuilders.branchSchema('string-matchers')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    MatchersScenarioCaseBuilders.branchNode('array-matchers'),
    MatchersScenarioCaseBuilders.branchNode('boolean-matchers'),
    MatchersScenarioCaseBuilders.branchNode('database-matchers'),
    MatchersScenarioCaseBuilders.branchNode('empty-variadics'),
    MatchersScenarioCaseBuilders.branchNode('http-matchers'),
    MatchersScenarioCaseBuilders.branchNode('immutable-matcher-route'),
    MatchersScenarioCaseBuilders.branchNode('logic-matchers'),
    MatchersScenarioCaseBuilders.branchNode('negative-matcher-route'),
    MatchersScenarioCaseBuilders.branchNode('network-matchers'),
    MatchersScenarioCaseBuilders.branchNode('number-matchers'),
    MatchersScenarioCaseBuilders.branchNode('string-matchers')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
