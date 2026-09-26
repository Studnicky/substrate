import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = ['configured-not-reached', 'count-wins', 'default-behavior', 'time-wins'] as const;

/** The scenario case shape `max-elapsed-ms.loop.spec.ts` exercises across `Retry`'s `maximumElapsedMs` budget. */
export namespace MaxElapsedMsScenarioCaseEntity {
  const retrySchema = {
    'additionalProperties': false,
    'properties': {
      'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
      'maximumRetries': { 'minimum': 0, 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  };

  const retryNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
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
          'attemptsLessThan': { 'minimum': 0, 'type': 'number' },
          'elapsedLessThanFactor': { 'minimum': 0, 'type': 'number' },
          'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
          'result': { 'type': 'string' },
          'totalRetries': { 'minimum': 0, 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'alwaysRetryable': { 'type': 'boolean' },
          'delayMs': { 'minimum': 0, 'type': 'number' },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
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
          'attemptsLessThan': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'elapsedLessThanFactor': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'alwaysRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
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
