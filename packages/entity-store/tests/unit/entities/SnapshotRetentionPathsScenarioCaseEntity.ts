import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { NestedUserEntity } from './common/NestedUserEntity.js';
import { SnapshotRetentionMutationsEntity } from './common/SnapshotRetentionMutationsEntity.js';

/** The `snapshot-retention-paths` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace SnapshotRetentionPathsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': {
        'minLength': 1,
        'type': 'string'
      },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'batched': NestedUserEntity.Schema,
          'replacement': NestedUserEntity.Schema,
          'upserted': NestedUserEntity.Schema
        },
        'required': ['batched', 'replacement', 'upserted'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batched': NestedUserEntity.Schema,
          'mutations': SnapshotRetentionMutationsEntity.Schema,
          'replacement': NestedUserEntity.Schema,
          'upserted': NestedUserEntity.Schema
        },
        'required': ['batched', 'mutations', 'replacement', 'upserted'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'snapshot-retention-paths'
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'expected': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'batched': NestedUserEntity.Node,
      'replacement': NestedUserEntity.Node,
      'upserted': NestedUserEntity.Node
    }, ['batched', 'replacement', 'upserted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'batched': NestedUserEntity.Node,
      'mutations': SnapshotRetentionMutationsEntity.Node,
      'replacement': NestedUserEntity.Node,
      'upserted': NestedUserEntity.Node
    }, ['batched', 'mutations', 'replacement', 'upserted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'snapshot-retention-paths' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
