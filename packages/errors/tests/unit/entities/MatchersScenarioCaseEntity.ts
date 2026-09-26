import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'array-matchers',
  'boolean-matchers',
  'database-matchers',
  'empty-variadics',
  'http-matchers',
  'immutable-matcher-route',
  'instance-matchers',
  'logic-matchers',
  'negative-matcher-route',
  'network-matchers',
  'number-matchers',
  'object-matchers',
  'proto-matchers',
  'string-matchers'
] as const;

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
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {},
        [] as const,
        { 'additionalProperties': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'arrayValue': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'booleanValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'code': SchemaNode.defineString({ 'type': 'string' } as const),
          'connectionCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'constraintCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'deadlockCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'errorName': SchemaNode.defineString({ 'type': 'string' } as const),
          'foreignKeyCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'numberValue': SchemaNode.defineOneOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]),
          'objectValue': SchemaNode.defineUnknown({} as const),
          'prototypeValue': SchemaNode.defineUnknown({} as const),
          'status': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'stringValue': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SCENARIO_SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
