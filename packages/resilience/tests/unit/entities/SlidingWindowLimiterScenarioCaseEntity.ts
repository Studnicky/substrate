import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `SlidingWindowLimiter.loop.spec.ts` scenario case shape. `expected` stays an open bag — each of the sixteen shapes reads a different subset via `String()`/`Number()`/`Boolean()` coercion, never a cast. */
export namespace SlidingWindowLimiterScenarioCaseEntity {
  const limiterInputSchema = {
    'additionalProperties': false,
    'properties': {
      'abortMessage': { 'type': 'string' },
      'admitCount': { 'type': 'number' },
      'advanceAfterRejectMs': { 'type': 'number' },
      'algorithm': { 'enum': ['log', 'counter'] },
      'consumeTokens': { 'type': 'number' },
      'firstAdvanceMs': { 'type': 'number' },
      'hook': { 'enum': ['allow', 'reject'] },
      'limit': { 'type': 'number' },
      'rollAfterMs': { 'type': 'number' },
      'secondAdvanceMs': { 'type': 'number' },
      'secondWaveAttempts': { 'type': 'number' },
      'waitTokens': { 'type': 'number' },
      'windowMs': { 'type': 'number' }
    },
    'required': ['algorithm', 'limit', 'windowMs'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': { 'slidingWindowLimiter': limiterInputSchema },
        'required': ['slidingWindowLimiter'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'async-allow-rejection', 'async-notification-order', 'counter-blends-previous-window', 'default-clock-consume',
          'default-clock-consume-counter', 'hook-error-isolation', 'hook-error-snapshot', 'hook-event', 'invalid-config',
          'limit-plus-one-throws', 'log-prunes-stale-entries', 'recovers-after-window', 'structural-compatibility',
          'wait-for-token-aborts', 'window-roll', 'within-limit'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const LimiterInputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'abortMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'admitCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'advanceAfterRejectMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'algorithm': SchemaNode.defineEnum(['log', 'counter'] as const),
      'consumeTokens': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'firstAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'hook': SchemaNode.defineEnum(['allow', 'reject'] as const),
      'limit': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'rollAfterMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'secondAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'secondWaveAttempts': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'waitTokens': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'windowMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['algorithm', 'limit', 'windowMs'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'slidingWindowLimiter': LimiterInputNode },
        ['slidingWindowLimiter'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'async-allow-rejection', 'async-notification-order', 'counter-blends-previous-window', 'default-clock-consume',
        'default-clock-consume-counter', 'hook-error-isolation', 'hook-error-snapshot', 'hook-event', 'invalid-config',
        'limit-plus-one-throws', 'log-prunes-stale-entries', 'recovers-after-window', 'structural-compatibility',
        'wait-for-token-aborts', 'window-roll', 'within-limit'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
