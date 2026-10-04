import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

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

const LimiterInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'abortMessage': SchemaNode.defineString({ 'type': 'string' } as const),
  'admitCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'advanceAfterRejectMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'algorithm': SchemaNode.defineEnum({}, ['log', 'counter'] as const),
  'consumeTokens': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'firstAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'hook': SchemaNode.defineEnum({}, ['allow', 'reject'] as const),
  'limit': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'rollAfterMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'secondAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'secondWaveAttempts': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'waitTokens': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'windowMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, ['algorithm', 'limit', 'windowMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class SlidingWindowLimiterScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
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
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'slidingWindowLimiter': LimiterInputNode }, ['slidingWindowLimiter'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The `SlidingWindowLimiter.loop.spec.ts` scenario case shape. `expected` stays an open bag — each of the sixteen shapes reads a different subset via `String()`/`Number()`/`Boolean()` coercion, never a cast. */
export namespace SlidingWindowLimiterScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('async-allow-rejection'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('async-notification-order'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('counter-blends-previous-window'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('default-clock-consume'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('default-clock-consume-counter'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('hook-error-isolation'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('hook-error-snapshot'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('hook-event'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('invalid-config'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('limit-plus-one-throws'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('log-prunes-stale-entries'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('recovers-after-window'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('structural-compatibility'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('wait-for-token-aborts'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('window-roll'),
      SlidingWindowLimiterScenarioCaseBuilders.branchSchema('within-limit')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('async-allow-rejection'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('async-notification-order'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('counter-blends-previous-window'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('default-clock-consume'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('default-clock-consume-counter'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('hook-error-isolation'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('hook-error-snapshot'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('hook-event'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('invalid-config'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('limit-plus-one-throws'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('log-prunes-stale-entries'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('recovers-after-window'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('structural-compatibility'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('wait-for-token-aborts'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('window-roll'),
    SlidingWindowLimiterScenarioCaseBuilders.branchNode('within-limit')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
