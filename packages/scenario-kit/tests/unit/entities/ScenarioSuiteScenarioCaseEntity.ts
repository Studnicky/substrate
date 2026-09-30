import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const closed = { 'additionalProperties': false, 'patternProperties': {} } as const;

const syncRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['value'] as const, closed),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'sync-record' as const)
}, ['description', 'input', 'name', 'shape'] as const, closed);

const asyncRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['value'] as const, closed),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'async-record' as const)
}, ['description', 'input', 'name', 'shape'] as const, closed);

/** Cases for the `ScenarioSuite` dispatch spec, discriminated by `shape`. */
export namespace ScenarioSuiteScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'input': { 'additionalProperties': false, 'properties': { 'value': { 'type': 'string' } }, 'required': ['value'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'sync-record' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'input': { 'additionalProperties': false, 'properties': { 'value': { 'type': 'string' } }, 'required': ['value'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'async-record' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [syncRecordNode, asyncRecordNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
