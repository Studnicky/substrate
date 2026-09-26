import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `StateMachineHooks.loop.spec.ts` scenario case shape. `expected` stays an open bag — each shape reads a different subset, coerced at the call site, never a cast. */
export namespace StateMachineHooksScenarioCaseEntity {
  const trafficStateSchema = {
    'additionalProperties': false,
    'properties': { 'variant': { 'enum': ['red', 'green', 'amber'] } },
    'required': ['variant'],
    'type': 'object'
  } as const;

  const trafficEventSchema = {
    'additionalProperties': false,
    'properties': { 'type': { 'const': 'advance' } },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'event': trafficEventSchema,
          'state': trafficStateSchema,
          'states': { 'items': trafficStateSchema, 'type': 'array' }
        },
        'required': ['event'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'transition-hook', 'enter-hook', 'exit-hook', 'hook-order', 'unchanged-no-hooks', 'multiple-transitions',
          'transition-rejected-hook', 'successful-transition-no-rejection', 'throwing-transition-hook',
          'throwing-rejection-hook', 'async-rejection'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const TrafficStateNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': SchemaNode.defineEnum({}, ['red', 'green', 'amber'] as const) }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const TrafficEventNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineConst({}, 'advance' as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'event': TrafficEventNode,
          'state': TrafficStateNode,
          'states': SchemaNode.defineArray({ 'type': 'array' } as const, TrafficStateNode, undefined)
        }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'transition-hook', 'enter-hook', 'exit-hook', 'hook-order', 'unchanged-no-hooks', 'multiple-transitions',
        'transition-rejected-hook', 'successful-transition-no-rejection', 'throwing-transition-hook',
        'throwing-rejection-hook', 'async-rejection'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
