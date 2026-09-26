import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const timeoutInputSchema = {
  'additionalProperties': false,
  'properties': { 'timeoutMs': { 'type': 'number' } },
  'required': ['timeoutMs'],
  'type': 'object'
} as const;

const timeoutInputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  ['timeoutMs'] as const,
  { 'additionalProperties': false }
);

const withResolvedExpectedSchema = <const TShape extends string>(shape: TShape) => ({
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
}) as const;

const withResolvedExpectedNode = <const TShape extends string>(shape: TShape) => SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'resolved': SchemaNode.defineConst(true as const) }, ['resolved'] as const, { 'additionalProperties': false }),
    'input': timeoutInputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst(shape)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

const delayResolvesWithoutSignalSchema = withResolvedExpectedSchema('delay-resolves-without-signal');
const delayResolvesWithoutSignalNode = withResolvedExpectedNode('delay-resolves-without-signal');
const delayResolvesWithNeverAbortedSignalSchema = withResolvedExpectedSchema('delay-resolves-with-never-aborted-signal');
const delayResolvesWithNeverAbortedSignalNode = withResolvedExpectedNode('delay-resolves-with-never-aborted-signal');

const withAbortedExpectedSchema = <const TShape extends string>(shape: TShape) => ({
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
}) as const;

const withAbortedExpectedNode = <const TShape extends string>(shape: TShape) => SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'errorCode': SchemaNode.defineConst('throttle.aborted' as const),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
      },
      ['errorCode', 'errorMessage', 'timeoutMs'] as const,
      { 'additionalProperties': false }
    ),
    'input': timeoutInputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst(shape)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

const delayRejectsAlreadyAbortedSchema = withAbortedExpectedSchema('delay-rejects-already-aborted');
const delayRejectsAlreadyAbortedNode = withAbortedExpectedNode('delay-rejects-already-aborted');
const delayRejectsBeforeTimeoutSchema = withAbortedExpectedSchema('delay-rejects-before-timeout');
const delayRejectsBeforeTimeoutNode = withAbortedExpectedNode('delay-rejects-before-timeout');

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

const delayRemovesAbortListenerNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'abortListenerAddCount': SchemaNode.defineConst(1 as const), 'abortListenerRemoveCount': SchemaNode.defineConst(1 as const) },
      ['abortListenerAddCount', 'abortListenerRemoveCount'] as const,
      { 'additionalProperties': false }
    ),
    'input': timeoutInputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst('delay-removes-abort-listener' as const)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

/** The five scenario case shapes `delay.loop.spec.ts` exercises. */
export namespace DelayScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      delayResolvesWithoutSignalSchema, delayResolvesWithNeverAbortedSignalSchema,
      delayRejectsAlreadyAbortedSchema, delayRejectsBeforeTimeoutSchema, delayRemovesAbortListenerSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    delayResolvesWithoutSignalNode, delayResolvesWithNeverAbortedSignalNode,
    delayRejectsAlreadyAbortedNode, delayRejectsBeforeTimeoutNode, delayRemovesAbortListenerNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
