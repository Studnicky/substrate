import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { ThrottleConfigEntity } from '../../../../src/entities/ThrottleConfigEntity.js';

const SHAPES = [
  'abort-after-abort-is-idempotent', 'abort-cancels-active-and-queued', 'abort-during-draining-cancels-active-and-queued',
  'abort-immediate-with-active-work', 'abort-on-complete-skips-grace-period', 'abort-start-hook-throws',
  'abort-timeout-completes', 'abort-timeout-timed-out', 'abort-zero-timeout-with-active-work',
  'drain-on-complete-returns-immediately', 'drain-reuses-completion-promise', 'drain-waits-for-active-and-queued',
  'execute-after-abort-throws', 'execute-during-draining-throws', 'on-acquire-throws', 'on-acquire-wait-throws',
  'on-contended-throws', 'on-reject-throws', 'on-release-throws', 'on-window-slide-throws',
  'on-release-fires-exactly-once-became-idle', 'on-release-fires-exactly-once-handoff-granted',
  'on-release-fires-exactly-once-on-acquire-rollback', 'on-release-fires-exactly-once-on-rejection',
  'on-release-fires-exactly-once-still-busy', 'queued-operation-completes-after-release'
] as const;

const abortResultSchema = {
  'additionalProperties': false,
  'properties': { 'cancelled': { 'type': 'number' }, 'completed': { 'type': 'number' }, 'timedOut': { 'type': 'boolean' } },
  'required': [],
  'type': 'object'
} as const;

const abortResultNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'cancelled': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'completed': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
  },
  [] as const,
  { 'additionalProperties': false }
);

const numberOrStringSchema = { 'oneOf': [{ 'type': 'number' }, { 'minLength': 1, 'type': 'string' }] } as const;
const numberOrStringNode = SchemaNode.defineOneOf([
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
] as const);

/** `lifecycle.loop.spec.ts` exercises a single flat case shape across twenty-six scenario names. */
export namespace LifecycleScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'abort': abortResultSchema,
          'activeCount': { 'type': 'number' },
          'activeResolvedWithUndefined': { 'type': 'boolean' },
          'activeResult': { 'minLength': 1, 'type': 'string' },
          'causeMessage': { 'minLength': 1, 'type': 'string' },
          'drainResolvedBeforeRelease': { 'type': 'boolean' },
          'errorName': { 'minLength': 1, 'type': 'string' },
          'isComplete': { 'type': 'boolean' },
          'order': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'queuedCount': { 'type': 'number' },
          'queuedResolvedWithUndefined': { 'type': 'boolean' },
          'queuedStarted': { 'type': 'boolean' },
          'releaseCount': { 'type': 'number' },
          'result': { 'minLength': 1, 'type': 'string' },
          'results': { 'items': { 'type': 'number' }, 'type': 'array' },
          'secondAbort': abortResultSchema,
          'totalExecuted': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'abortOptions': {
            'additionalProperties': false,
            'properties': { 'timeout': { 'type': 'number' } },
            'required': ['timeout'],
            'type': 'object'
          },
          'activeResult': numberOrStringSchema,
          'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
          'operationErrorMessage': { 'minLength': 1, 'type': 'string' },
          'queuedResult': numberOrStringSchema,
          'settleMs': { 'type': 'number' },
          'throttle': ThrottleConfigEntity.Schema
        },
        'required': ['throttle'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
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
        {
          'abort': abortResultNode,
          'activeCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'activeResolvedWithUndefined': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'activeResult': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'causeMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'drainResolvedBeforeRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'isComplete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)),
          'queuedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'queuedResolvedWithUndefined': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'queuedStarted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'secondAbort': abortResultNode,
          'totalExecuted': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'abortOptions': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) },
            ['timeout'] as const,
            { 'additionalProperties': false }
          ),
          'activeResult': numberOrStringNode,
          'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'operationErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'queuedResult': numberOrStringNode,
          'settleMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'throttle': ThrottleConfigEntity.Node
        },
        ['throttle'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
