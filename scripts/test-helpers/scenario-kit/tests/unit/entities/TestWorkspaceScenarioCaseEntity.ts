import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one case branch per `TestWorkspace` behavior; every branch shares the input and expected shapes and differs only in its `shape` constant. */
class TestWorkspaceBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const schema = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': { 'additionalProperties': false, 'properties': { 'detail': {} }, 'required': ['detail'], 'type': 'object' },
        'input': {
          'additionalProperties': false,
          'properties': { 'content': { 'type': 'string' }, 'path': { 'type': 'string' }, 'to': { 'type': 'string' } },
          'required': ['path'],
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'detail': SchemaNode.defineUnknown({}) }, ['detail'] as const, closed),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'content': SchemaNode.defineString({ 'type': 'string' } as const),
        'path': SchemaNode.defineString({ 'type': 'string' } as const),
        'to': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['path'] as const, closed),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, closed);
    return node;
  }
}

/** One case per `TestWorkspace` behavior, discriminated by `shape`. */
export namespace TestWorkspaceScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      TestWorkspaceBranches.schema('write-then-read'),
      TestWorkspaceBranches.schema('mkdir-then-list'),
      TestWorkspaceBranches.schema('rename-moves-file'),
      TestWorkspaceBranches.schema('remove-deletes-tree'),
      TestWorkspaceBranches.schema('create-rejects'),
      TestWorkspaceBranches.schema('read-rejects'),
      TestWorkspaceBranches.schema('write-rejects'),
      TestWorkspaceBranches.schema('list-rejects'),
      TestWorkspaceBranches.schema('rename-rejects'),
      TestWorkspaceBranches.schema('realpath-rejects')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    TestWorkspaceBranches.node('write-then-read'),
    TestWorkspaceBranches.node('mkdir-then-list'),
    TestWorkspaceBranches.node('rename-moves-file'),
    TestWorkspaceBranches.node('remove-deletes-tree'),
    TestWorkspaceBranches.node('create-rejects'),
    TestWorkspaceBranches.node('read-rejects'),
    TestWorkspaceBranches.node('write-rejects'),
    TestWorkspaceBranches.node('list-rejects'),
    TestWorkspaceBranches.node('rename-rejects'),
    TestWorkspaceBranches.node('realpath-rejects')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
