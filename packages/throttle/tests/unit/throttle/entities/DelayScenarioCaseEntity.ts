import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const timeoutInputSchema = {
  'additionalProperties': false,
  'properties': { 'timeoutMs': { 'type': 'number' } },
  'required': ['timeoutMs'],
  'type': 'object'
} as const;

const timeoutInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeoutMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

class DelayScenarioCaseEntityBuilders {
  static withResolvedExpectedSchema<const TShape extends string>(shape: TShape) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'resolved': { 'const': true } }, 'required': ['resolved'], 'type': 'object' },
      'input': timeoutInputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}

  static withResolvedExpectedNode<const TShape extends string>(shape: TShape) {const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'resolved': SchemaNode.defineConst({}, true as const) }, ['resolved'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': timeoutInputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return result;}

  static withAbortedExpectedSchema<const TShape extends string>(shape: TShape) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'errorCode': { 'const': 'throttle.aborted' }, 'errorMessage': { 'minLength': 1, 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
        'required': ['errorCode', 'errorMessage', 'timeoutMs'],
        'type': 'object'
      },
      'input': timeoutInputSchema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}

  static withAbortedExpectedNode<const TShape extends string>(shape: TShape) {const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'errorCode': SchemaNode.defineConst({}, 'throttle.aborted' as const),
      'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['errorCode', 'errorMessage', 'timeoutMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': timeoutInputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return result;}
}

const delayResolvesWithoutSignalSchema = DelayScenarioCaseEntityBuilders.withResolvedExpectedSchema('delay-resolves-without-signal');
const delayResolvesWithoutSignalNode = DelayScenarioCaseEntityBuilders.withResolvedExpectedNode('delay-resolves-without-signal');
const delayResolvesWithNeverAbortedSignalSchema = DelayScenarioCaseEntityBuilders.withResolvedExpectedSchema('delay-resolves-with-never-aborted-signal');
const delayResolvesWithNeverAbortedSignalNode = DelayScenarioCaseEntityBuilders.withResolvedExpectedNode('delay-resolves-with-never-aborted-signal');

const delayRejectsAlreadyAbortedSchema = DelayScenarioCaseEntityBuilders.withAbortedExpectedSchema('delay-rejects-already-aborted');
const delayRejectsAlreadyAbortedNode = DelayScenarioCaseEntityBuilders.withAbortedExpectedNode('delay-rejects-already-aborted');
const delayRejectsBeforeTimeoutSchema = DelayScenarioCaseEntityBuilders.withAbortedExpectedSchema('delay-rejects-before-timeout');
const delayRejectsBeforeTimeoutNode = DelayScenarioCaseEntityBuilders.withAbortedExpectedNode('delay-rejects-before-timeout');

const delayRemovesAbortListenerSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'abortListenerAddCount': { 'const': 1 }, 'abortListenerRemoveCount': { 'const': 1 } },
      'required': ['abortListenerAddCount', 'abortListenerRemoveCount'],
      'type': 'object'
    },
    'input': timeoutInputSchema,
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'delay-removes-abort-listener' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const delayRemovesAbortListenerNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortListenerAddCount': SchemaNode.defineConst({}, 1 as const), 'abortListenerRemoveCount': SchemaNode.defineConst({}, 1 as const) }, ['abortListenerAddCount', 'abortListenerRemoveCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': timeoutInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'delay-removes-abort-listener' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The five scenario case shapes `delay.loop.spec.ts` exercises. */
export namespace DelayScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      delayResolvesWithoutSignalSchema, delayResolvesWithNeverAbortedSignalSchema,
      delayRejectsAlreadyAbortedSchema, delayRejectsBeforeTimeoutSchema, delayRemovesAbortListenerSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    delayResolvesWithoutSignalNode, delayResolvesWithNeverAbortedSignalNode,
    delayRejectsAlreadyAbortedNode, delayRejectsBeforeTimeoutNode, delayRemovesAbortListenerNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
