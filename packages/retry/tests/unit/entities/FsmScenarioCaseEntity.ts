import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const CALL_STATE_VARIANTS = ['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'] as const;

/** The scenario case shape `fsm.loop.spec.ts` exercises across every `Retry` state-machine transition. */
export namespace FsmScenarioCaseEntity {
  const transitionSchema = {
    'additionalProperties': false,
    'properties': { 'from': { 'enum': CALL_STATE_VARIANTS }, 'to': { 'enum': CALL_STATE_VARIANTS } },
    'required': ['from', 'to'],
    'type': 'object'
  };

  const transitionNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'from': SchemaNode.defineEnum(CALL_STATE_VARIANTS), 'to': SchemaNode.defineEnum(CALL_STATE_VARIANTS) },
    ['from', 'to'] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'errorMessageIncludes': { 'minLength': 1, 'type': 'string' },
          'errorName': { 'minLength': 1, 'type': 'string' },
          'exhausted': transitionSchema,
          'result': { 'type': 'string' },
          'transitions': { 'items': transitionSchema, 'type': 'array' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': { 'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
          'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
          'maximumRetries': { 'minimum': 0, 'type': 'number' },
          'rejectedTransition': transitionSchema,
          'result': { 'type': 'string' }
        },
        'required': ['maximumRetries'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'aborted-by-hook', 'exhausted-after-max-elapsed', 'exhausted-after-max-retries',
          'illegal-transition', 'immediate-success', 'non-retryable-error', 'retryable-failure-then-success'
        ]
      }
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
          'errorMessageIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'exhausted': transitionNode,
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'transitions': SchemaNode.defineArray({ 'type': 'array' } as const, transitionNode)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'batch': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) },
            [] as const,
            { 'additionalProperties': false }
          ),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'rejectedTransition': transitionNode,
          'result': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        ['maximumRetries'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'aborted-by-hook', 'exhausted-after-max-elapsed', 'exhausted-after-max-retries',
        'illegal-transition', 'immediate-success', 'non-retryable-error', 'retryable-failure-then-success'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export type Type = NodeStaticType<typeof Node>;
}
