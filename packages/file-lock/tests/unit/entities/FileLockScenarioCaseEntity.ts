import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Optional poll/timeout override passed through to `FileLock.create()`. `timeoutMs` is always present when `fileLock` is; `pollMs` is not. */
const pollTimeoutConfigSchema = {
  'additionalProperties': false,
  'properties': { 'pollMs': { 'type': 'number' }, 'timeoutMs': { 'type': 'number' } },
  'required': ['timeoutMs'],
  'type': 'object'
} as const;

const PollTimeoutConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'pollMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeoutMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** `{ path, content }` pair shared by the two hook-isolation instances in `hook-errors-isolated-per-instance`. */
const pathContentSchema = {
  'additionalProperties': false,
  'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
  'required': ['content', 'path'],
  'type': 'object'
} as const;

const PathContentNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['content', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The single-field expectation recorded per hook-isolation instance. */
const messageOnlySchema = {
  'additionalProperties': false,
  'properties': { 'message': { 'minLength': 1, 'type': 'string' } },
  'required': ['message'],
  'type': 'object'
} as const;

const MessageOnlyNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The 20 `FileLock.loop.spec.ts` scenario shapes, discriminated by `shape`. */
export namespace FileLockScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'timedOut': { 'type': 'boolean' } },
            'required': ['timedOut'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'fileLock': pollTimeoutConfigSchema, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'timeout-missing-file' }
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
            'properties': { 'existedAfterRelease': { 'type': 'boolean' }, 'existedDuringLock': { 'type': 'boolean' } },
            'required': ['existedDuringLock', 'existedAfterRelease'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'acquire-success-restores-path' }
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
            'properties': { 'timedOut': { 'type': 'boolean' } },
            'required': ['timedOut'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'fileLock': pollTimeoutConfigSchema,
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'contention-times-out' }
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
            'properties': { 'content': { 'minLength': 1, 'type': 'string' } },
            'required': ['content'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'read-after-create' }
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
            'properties': { 'content': { 'minLength': 1, 'type': 'string' } },
            'required': ['content'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'originalContent': { 'minLength': 1, 'type': 'string' },
              'path': { 'minLength': 1, 'type': 'string' },
              'updatedContent': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'originalContent', 'updatedContent'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'write-then-release-restores-new-content' }
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
            'properties': { 'releaseCount': { 'type': 'number' } },
            'required': ['releaseCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'release-idempotent' }
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
            'properties': { 'existedAfterDispose': { 'type': 'boolean' }, 'existedDuringLock': { 'type': 'boolean' } },
            'required': ['existedDuringLock', 'existedAfterDispose'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'symbol-dispose-releases' }
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
            'properties': { 'timedOut': { 'type': 'boolean' } },
            'required': ['timedOut'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'fileLock': pollTimeoutConfigSchema,
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'poll-and-timeout-options' }
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
            'properties': { 'acquireCount': { 'type': 'number' }, 'startCount': { 'type': 'number' } },
            'required': ['startCount', 'acquireCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-acquire-start-and-acquire' }
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
            'properties': { 'releaseCount': { 'type': 'number' } },
            'required': ['releaseCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-release-original-path' }
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
            'properties': { 'releaseCount': { 'type': 'number' } },
            'required': ['releaseCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-idempotent-release' }
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
            'properties': { 'timedOut': { 'type': 'boolean' } },
            'required': ['timedOut'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'fileLock': pollTimeoutConfigSchema, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-timeout' }
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
              'minimumContentions': { 'type': 'number' },
              'minimumWaits': { 'type': 'number' },
              'timeoutCount': { 'type': 'number' }
            },
            'required': ['minimumContentions', 'minimumWaits', 'timeoutCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'fileLock': pollTimeoutConfigSchema,
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-contention-wait-and-timeout' }
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
            'properties': { 'order': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['order'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'fileLock': pollTimeoutConfigSchema,
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-order' }
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
            'properties': { 'orphaned': { 'type': 'boolean' } },
            'required': ['orphaned'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'content', 'hookErrorMessage'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onAcquire-does-not-orphan-lock' }
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
            'properties': { 'hookCauseMessage': { 'minLength': 1, 'type': 'string' } },
            'required': ['hookCauseMessage'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'async-rejecting-onAcquire-guarded' }
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
            'properties': { 'first': messageOnlySchema, 'second': messageOnlySchema },
            'required': ['first', 'second'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'first': pathContentSchema, 'second': pathContentSchema },
            'required': ['first', 'second'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-errors-isolated-per-instance' }
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
            'properties': { 'releaseCount': { 'type': 'number' } },
            'required': ['releaseCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'content': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'symbol-dispose-hook' }
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
            'properties': { 'existedAfterRelease': { 'type': 'boolean' }, 'existedDuringLock': { 'type': 'boolean' } },
            'required': ['existedDuringLock', 'existedAfterRelease'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'content': { 'minLength': 1, 'type': 'string' },
              'filename': { 'minLength': 1, 'type': 'string' },
              'fileLock': pollTimeoutConfigSchema
            },
            'required': ['filename', 'content'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'bare-relative-filename-contention' }
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
              'contendedCount': { 'type': 'number' },
              'errorCount': { 'type': 'number' },
              'errorMessageIncludes': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['errorMessageIncludes', 'errorCount', 'contendedCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fileLock': pollTimeoutConfigSchema,
              'fileSystemError': {
                'additionalProperties': false,
                'properties': { 'code': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' } },
                'required': ['code', 'message'],
                'type': 'object'
              },
              'path': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['path', 'fileSystemError', 'fileLock'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'genuine-fs-error-routes-to-onError' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['timedOut'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fileLock': PollTimeoutConfigNode, 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'timeout-missing-file' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'existedAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'existedDuringLock': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          }, ['existedDuringLock', 'existedAfterRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'acquire-success-restores-path' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['timedOut'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'fileLock': PollTimeoutConfigNode,
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'contention-times-out' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'read-after-create' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'originalContent': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'updatedContent': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'originalContent', 'updatedContent'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'write-then-release-restores-new-content' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'release-idempotent' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'existedAfterDispose': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'existedDuringLock': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          }, ['existedDuringLock', 'existedAfterDispose'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'symbol-dispose-releases' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['timedOut'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'fileLock': PollTimeoutConfigNode,
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'poll-and-timeout-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'acquireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'startCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['startCount', 'acquireCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-acquire-start-and-acquire' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-release-original-path' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-idempotent-release' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['timedOut'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fileLock': PollTimeoutConfigNode, 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-timeout' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'minimumContentions': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'minimumWaits': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'timeoutCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['minimumContentions', 'minimumWaits', 'timeoutCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'fileLock': PollTimeoutConfigNode,
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-contention-wait-and-timeout' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['order'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'fileLock': PollTimeoutConfigNode,
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-order' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'orphaned': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['orphaned'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content', 'hookErrorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onAcquire-does-not-orphan-lock' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookCauseMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['hookCauseMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'async-rejecting-onAcquire-guarded' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'first': MessageOnlyNode, 'second': MessageOnlyNode }, ['first', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'first': PathContentNode, 'second': PathContentNode }, ['first', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-errors-isolated-per-instance' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'symbol-dispose-hook' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'existedAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'existedDuringLock': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          }, ['existedDuringLock', 'existedAfterRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'content': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'fileLock': PollTimeoutConfigNode,
            'filename': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['filename', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'bare-relative-filename-contention' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'contendedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'errorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'errorMessageIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['errorMessageIncludes', 'errorCount', 'contendedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'fileLock': PollTimeoutConfigNode,
            'fileSystemError': SchemaNode.defineObject({ 'type': 'object' } as const, {
                'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
                'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
              }, ['code', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['path', 'fileSystemError', 'fileLock'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'genuine-fs-error-routes-to-onError' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
