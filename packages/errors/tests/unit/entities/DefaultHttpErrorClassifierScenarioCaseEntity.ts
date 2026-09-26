import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `default-http-error-classifier.loop.spec.ts` exercises. */
export namespace DefaultHttpErrorClassifierScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'attemptNumber': { 'type': 'number' },
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'reason': { 'type': 'string' }, 'retryable': { 'type': 'boolean' } },
        'required': ['reason', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'code': { 'type': 'string' },
          'message': { 'type': 'string' },
          'status': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['client-error', 'gateway-error', 'network-code', 'network-message', 'rate-limited', 'request-timeout', 'server-error', 'unknown-early', 'unknown-late'] }
    },
    'required': ['attemptNumber', 'description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'attemptNumber': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'reason': SchemaNode.defineString({ 'type': 'string' } as const), 'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        ['reason', 'retryable'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'code': SchemaNode.defineString({ 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['client-error', 'gateway-error', 'network-code', 'network-message', 'rate-limited', 'request-timeout', 'server-error', 'unknown-early', 'unknown-late'] as const)
    },
    ['attemptNumber', 'description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
