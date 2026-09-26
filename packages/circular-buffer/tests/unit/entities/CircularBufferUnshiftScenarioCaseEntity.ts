import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CircularBufferOptionsEntity } from '../../../src/entities/CircularBufferOptionsEntity.js';

const shiftedNode = SchemaNode.defineOneOf({}, [
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
  SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
]);

const expectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'evictLog': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
    'length': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'newCapacity': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'oldCapacity': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'overflowLog': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
    'pushCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'shifted': shiftedNode
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shape `CircularBuffer.unshift.loop.spec.ts` exercises. */
export namespace CircularBufferUnshiftScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'evictLog': { 'items': { 'type': 'number' }, 'type': 'array' },
          'length': { 'minimum': 0, 'type': 'integer' },
          'newCapacity': { 'minimum': 0, 'type': 'integer' },
          'oldCapacity': { 'minimum': 0, 'type': 'integer' },
          'overflowLog': { 'items': { 'type': 'number' }, 'type': 'array' },
          'pushCount': { 'minimum': 0, 'type': 'integer' },
          'shifted': { 'oneOf': [{ 'type': 'number' }, { 'items': { 'type': 'number' }, 'type': 'array' }, { 'items': { 'type': 'string' }, 'type': 'array' }] }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'options': CircularBufferOptionsEntity.Schema },
        'required': ['options'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'grow-mode-unshift-fires-onGrow', 'grow-mode-unshift-grows', 'interleaved-wraparound-order',
          'mixed-push-unshift-shift-order', 'multiple-unshifts-reverse-order', 'onPush-fires-for-unshift',
          'overwrite-mode-unshift-evicts-tail', 'overwrite-mode-unshift-fires-hooks', 'unshift-adds-item',
          'unshift-empty-then-shift', 'unshift-then-shift-order'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': CircularBufferOptionsEntity.Node }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'grow-mode-unshift-fires-onGrow', 'grow-mode-unshift-grows', 'interleaved-wraparound-order',
        'mixed-push-unshift-shift-order', 'multiple-unshifts-reverse-order', 'onPush-fires-for-unshift',
        'overwrite-mode-unshift-evicts-tail', 'overwrite-mode-unshift-fires-hooks', 'unshift-adds-item',
        'unshift-empty-then-shift', 'unshift-then-shift-order'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
}
