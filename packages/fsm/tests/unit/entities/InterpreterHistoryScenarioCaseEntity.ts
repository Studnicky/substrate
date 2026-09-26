import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `InterpreterHistory.loop.spec.ts` scenario case shape. `expected` stays an open bag — each shape reads a different subset, coerced at the call site, never a cast. */
export namespace InterpreterHistoryScenarioCaseEntity {
  const eventDetailsSchema = {
    'additionalProperties': false,
    'properties': { 'value': { 'type': 'number' } },
    'required': ['value'],
    'type': 'object'
  } as const;

  const replacementValuesSchema = {
    'additionalProperties': false,
    'properties': { 'event': { 'type': 'number' }, 'from': { 'type': 'number' }, 'to': { 'type': 'number' } },
    'required': ['event', 'from', 'to'],
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
          'capacity': { 'type': 'number' },
          'eventDetails': eventDetailsSchema,
          'machineId': { 'type': 'string' },
          'message': { 'type': 'string' },
          'replacementValues': replacementValuesSchema,
          'steps': { 'type': 'number' }
        },
        'required': ['capacity', 'machineId'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'empty-machine-id', 'non-positive-capacity', 'non-integer-capacity', 'history-empty-before-transitions',
          'records-transitions-in-order', 'no-record-for-unchanged-state', 'evicts-oldest-when-capacity-exceeded',
          'snapshot-isolated-from-later-transitions', 'fresh-array-each-call', 'deeply-isolated-history-records',
          'fully-functional-effect-interpreter'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const EventDetailsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const ReplacementValuesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'event': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'from': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'to': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['event', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'eventDetails': EventDetailsNode,
          'machineId': SchemaNode.defineString({ 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'replacementValues': ReplacementValuesNode,
          'steps': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['capacity', 'machineId'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'empty-machine-id', 'non-positive-capacity', 'non-integer-capacity', 'history-empty-before-transitions',
        'records-transitions-in-order', 'no-record-for-unchanged-state', 'evicts-oldest-when-capacity-exceeded',
        'snapshot-isolated-from-later-transitions', 'fresh-array-each-call', 'deeply-isolated-history-records',
        'fully-functional-effect-interpreter'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
