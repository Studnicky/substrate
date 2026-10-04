import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { RuntimeNumberEntity } from './RuntimeNumberEntity.js';

/** Names the virtual time counter options a scenario passes: the defaults, or an options object whose `startMs` may be non-finite. */
export namespace VirtualTimeCounterOptionsFixtureEntity {
  export const Schema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'default' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': {
          'shape': { 'const': 'options' },
          'value': { 'additionalProperties': false, 'properties': { 'startMs': RuntimeNumberEntity.Schema }, 'type': 'object' }
        },
        'required': ['shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'default' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'shape': SchemaNode.defineConst({}, 'options' as const),
      'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'startMs': RuntimeNumberEntity.Node }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
