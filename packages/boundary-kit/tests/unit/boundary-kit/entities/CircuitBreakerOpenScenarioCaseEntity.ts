import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CircuitBreakerAndRetryConfigEntity } from './common/CircuitBreakerAndRetryConfigEntity.js';

/** The `circuit-breaker-open` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace CircuitBreakerOpenScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'breakerStateAfterFirst': { 'const': 'closed' },
          'breakerStateAfterSecond': { 'const': 'open' },
          'callCount': { 'type': 'number' },
          'rejectionName': { 'type': 'string' }
        },
        'required': ['breakerStateAfterFirst', 'breakerStateAfterSecond', 'callCount', 'rejectionName'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundaryKit': {
            'additionalProperties': false,
            'properties': { 'config': CircuitBreakerAndRetryConfigEntity.Schema },
            'required': ['config'],
            'type': 'object'
          }
        },
        'required': ['boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'circuit-breaker-open' }
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
          'breakerStateAfterFirst': SchemaNode.defineConst('closed' as const),
          'breakerStateAfterSecond': SchemaNode.defineConst('open' as const),
          'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'rejectionName': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        ['breakerStateAfterFirst', 'breakerStateAfterSecond', 'callCount', 'rejectionName'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'boundaryKit': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'config': CircuitBreakerAndRetryConfigEntity.Node },
            ['config'] as const,
            { 'additionalProperties': false }
          )
        },
        ['boundaryKit'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('circuit-breaker-open' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
