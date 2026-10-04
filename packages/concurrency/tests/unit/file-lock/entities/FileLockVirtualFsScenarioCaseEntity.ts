import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** One `Map` seed entry for the injected `VirtualFileSystem`. */
const fileSystemSeedEntrySchema = {
  'additionalProperties': false,
  'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
  'required': ['path', 'content'],
  'type': 'object'
} as const;

const FileSystemSeedEntryNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  },
  ['path', 'content'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

/** The two `FileLockVirtualFs.loop.spec.ts` scenario shapes, discriminated by `shape`. */
export namespace FileLockVirtualFsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'firstAcquire': { 'const': true },
              'secondAcquireRejected': { 'const': true },
              'thirdAcquire': { 'const': true }
            },
            'required': ['firstAcquire', 'secondAcquireRejected', 'thirdAcquire'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fileLock': {
                'additionalProperties': false,
                'properties': {
                  'first': {
                    'additionalProperties': false,
                    'properties': { 'timeoutMs': { 'type': 'number' } },
                    'required': ['timeoutMs'],
                    'type': 'object'
                  },
                  'second': {
                    'additionalProperties': false,
                    'properties': { 'timeoutMs': { 'type': 'number' } },
                    'required': ['timeoutMs'],
                    'type': 'object'
                  },
                  'third': {
                    'additionalProperties': false,
                    'properties': { 'timeoutMs': { 'type': 'number' } },
                    'required': ['timeoutMs'],
                    'type': 'object'
                  }
                },
                'required': ['first', 'second', 'third'],
                'type': 'object'
              },
              'fileSystemSeed': { 'items': fileSystemSeedEntrySchema, 'type': 'array' },
              'lockPath': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['fileLock', 'fileSystemSeed', 'lockPath'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-fs-mutual-exclusion' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'initialContents': { 'minLength': 1, 'type': 'string' },
              'updatedContents': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['initialContents', 'updatedContents'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fileLock': {
                'additionalProperties': false,
                'properties': {
                  'first': {
                    'additionalProperties': false,
                    'properties': { 'timeoutMs': { 'type': 'number' } },
                    'required': ['timeoutMs'],
                    'type': 'object'
                  },
                  'second': {
                    'additionalProperties': false,
                    'properties': { 'timeoutMs': { 'type': 'number' } },
                    'required': ['timeoutMs'],
                    'type': 'object'
                  }
                },
                'required': ['first', 'second'],
                'type': 'object'
              },
              'fileSystemSeed': { 'items': fileSystemSeedEntrySchema, 'type': 'array' },
              'lockPath': { 'minLength': 1, 'type': 'string' },
              'updatedContents': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['fileLock', 'fileSystemSeed', 'lockPath', 'updatedContents'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-fs-read-write' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  const TimeoutOnlyNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['timeoutMs'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );

  const FileSystemSeedNode = SchemaNode.defineArray(
    { 'type': 'array' } as const,
    FileSystemSeedEntryNode,
    undefined
  );

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'firstAcquire': SchemaNode.defineConst({}, true as const),
            'secondAcquireRejected': SchemaNode.defineConst({}, true as const),
            'thirdAcquire': SchemaNode.defineConst({}, true as const)
          },
          ['firstAcquire', 'secondAcquireRejected', 'thirdAcquire'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'fileLock': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'first': TimeoutOnlyNode, 'second': TimeoutOnlyNode, 'third': TimeoutOnlyNode },
              ['first', 'second', 'third'] as const,
              { 'additionalProperties': false, 'patternProperties': {} }
            ),
            'fileSystemSeed': FileSystemSeedNode,
            'lockPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          },
          ['fileLock', 'fileSystemSeed', 'lockPath'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'virtual-fs-mutual-exclusion' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'initialContents': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'updatedContents': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          },
          ['initialContents', 'updatedContents'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'fileLock': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'first': TimeoutOnlyNode, 'second': TimeoutOnlyNode },
              ['first', 'second'] as const,
              { 'additionalProperties': false, 'patternProperties': {} }
            ),
            'fileSystemSeed': FileSystemSeedNode,
            'lockPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'updatedContents': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          },
          ['fileLock', 'fileSystemSeed', 'lockPath', 'updatedContents'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'virtual-fs-read-write' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
