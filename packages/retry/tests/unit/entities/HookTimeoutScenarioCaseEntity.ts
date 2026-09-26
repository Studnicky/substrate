import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'enter-call-unset', 'fast-hook', 'hung-attempt-with-timeout',
  'hung-attempt-without-timeout', 'hung-give-up-with-timeout', 'hung-retry-scheduled'
] as const;

/** The scenario case shape `hook-timeout.loop.spec.ts` exercises across `Retry`'s `hookTimeoutMs` behavior. */
export namespace HookTimeoutScenarioCaseEntity {
  const retrySchema = {
    'additionalProperties': false,
    'properties': {
      'hookTimeoutMs': { 'minimum': 0, 'type': 'number' },
      'maximumRetries': { 'minimum': 0, 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  };

  const retryNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'hookTimeoutMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
      'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
    },
    [] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'attempts': { 'minimum': 0, 'type': 'number' },
          'elapsedLessThanMs': { 'minimum': 0, 'type': 'number' },
          'errorShape': { 'minLength': 1, 'type': 'string' },
          'raceResult': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' }
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
          'delayMs': { 'minimum': 0, 'type': 'number' },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' },
          'retry': retrySchema
        },
        'required': [],
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
          'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'elapsedLessThanMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'raceResult': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const)
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
          'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'retry': retryNode
        },
        [] as const,
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
