import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one case branch per `ScenarioValues` reader; every branch shares the input and expected shapes and differs only in its `shape` constant. */
class ScenarioValuesBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const schema = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': { 'detail': {}, 'outcome': { 'enum': ['rejects', 'returns'] } },
          'required': ['detail', 'outcome'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'key': { 'type': 'string' }, 'label': { 'type': 'string' }, 'value': {} },
          'required': ['label', 'value'],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return schema;
  }

  static node<const TShape extends string>(shape: TShape) {
    const closed = { 'additionalProperties': false, 'patternProperties': {} } as const;
    const node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'detail': SchemaNode.defineUnknown({}),
        'outcome': SchemaNode.defineEnum({}, ['rejects', 'returns'] as const)
      }, ['detail', 'outcome'] as const, closed),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'key': SchemaNode.defineString({ 'type': 'string' } as const),
        'label': SchemaNode.defineString({ 'type': 'string' } as const),
        'value': SchemaNode.defineUnknown({})
      }, ['label', 'value'] as const, closed),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);
    return node;
  }
}

/** One case per `ScenarioValues` reader, discriminated by `shape` (the reader name): the reader either returns the value or rejects it. */
export namespace ScenarioValuesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ScenarioValuesBranches.schema('requireArray'),
      ScenarioValuesBranches.schema('requireBoolean'),
      ScenarioValuesBranches.schema('requireDefined'),
      ScenarioValuesBranches.schema('requireFiniteNumber'),
      ScenarioValuesBranches.schema('requireInteger'),
      ScenarioValuesBranches.schema('requireNumber'),
      ScenarioValuesBranches.schema('requireNumberArray'),
      ScenarioValuesBranches.schema('requireProperty'),
      ScenarioValuesBranches.schema('requireRecord'),
      ScenarioValuesBranches.schema('requireString'),
      ScenarioValuesBranches.schema('requireStringArray')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ScenarioValuesBranches.node('requireArray'),
    ScenarioValuesBranches.node('requireBoolean'),
    ScenarioValuesBranches.node('requireDefined'),
    ScenarioValuesBranches.node('requireFiniteNumber'),
    ScenarioValuesBranches.node('requireInteger'),
    ScenarioValuesBranches.node('requireNumber'),
    ScenarioValuesBranches.node('requireNumberArray'),
    ScenarioValuesBranches.node('requireProperty'),
    ScenarioValuesBranches.node('requireRecord'),
    ScenarioValuesBranches.node('requireString'),
    ScenarioValuesBranches.node('requireStringArray')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
