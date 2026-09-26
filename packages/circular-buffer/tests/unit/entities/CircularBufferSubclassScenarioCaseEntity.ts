import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CircularBufferOptionsEntity } from '../../../src/entities/CircularBufferOptionsEntity.js';

const bufferItemNode = SchemaNode.defineOneOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]);

const growLogEntryNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'newCapacity': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'oldCapacity': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) },
  ['newCapacity', 'oldCapacity'] as const,
  { 'additionalProperties': false }
);

const inspectStateNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'capacity': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'head': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'length': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'tail': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)
  },
  ['capacity', 'head', 'length', 'tail'] as const,
  { 'additionalProperties': false }
);

const asyncOperationNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'method': SchemaNode.defineEnum(['push', 'unshift'] as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  ['method', 'value'] as const,
  { 'additionalProperties': false }
);

const batchNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'pushStageCounts': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)),
    'shiftCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)
  },
  [] as const,
  { 'additionalProperties': false }
);

const inputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'asyncOperations': SchemaNode.defineArray({ 'type': 'array' } as const, asyncOperationNode),
    'batch': batchNode,
    'flushTurns': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'options': CircularBufferOptionsEntity.Node,
    'pushItems': SchemaNode.defineArray({ 'type': 'array' } as const, bufferItemNode),
    'pushValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
  },
  ['options'] as const,
  { 'additionalProperties': false }
);

const expectedNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'evictItems': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
    'evictItemsLength': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'evictLog': SchemaNode.defineArray({ 'type': 'array' } as const, bufferItemNode),
    'firstShift': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'firstShiftValues': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
    'growEventsLength': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'growLog': SchemaNode.defineArray({ 'type': 'array' } as const, growLogEntryNode),
    'growOldCapacitiesFirst': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)),
    'growOldCapacitiesSecond': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)),
    'length': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'lengthAtHook': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'minHookErrors': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'pushCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'pushItemsLength': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'rejectionCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'result': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
    'returned': SchemaNode.defineString({ 'type': 'string' } as const),
    'secondShift': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'shiftCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'shiftItemsLength': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'shiftLog': SchemaNode.defineArray({ 'type': 'array' } as const, bufferItemNode),
    'shiftValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'shiftValues': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
    'state': inspectStateNode
  },
  [] as const,
  { 'additionalProperties': false }
);

/** The scenario case shape `CircularBuffer.subclass.loop.spec.ts` exercises for subclass-hook behavior. */
export namespace CircularBufferSubclassScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'evictItems': { 'items': { 'type': 'number' }, 'type': 'array' },
          'evictItemsLength': { 'minimum': 0, 'type': 'integer' },
          'evictLog': { 'items': { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] }, 'type': 'array' },
          'firstShift': { 'type': 'number' },
          'firstShiftValues': { 'items': { 'type': 'number' }, 'type': 'array' },
          'growEventsLength': { 'minimum': 0, 'type': 'integer' },
          'growLog': {
            'items': {
              'additionalProperties': false,
              'properties': { 'newCapacity': { 'minimum': 0, 'type': 'integer' }, 'oldCapacity': { 'minimum': 0, 'type': 'integer' } },
              'required': ['newCapacity', 'oldCapacity'],
              'type': 'object'
            },
            'type': 'array'
          },
          'growOldCapacitiesFirst': { 'items': { 'minimum': 0, 'type': 'integer' }, 'type': 'array' },
          'growOldCapacitiesSecond': { 'items': { 'minimum': 0, 'type': 'integer' }, 'type': 'array' },
          'length': { 'minimum': 0, 'type': 'integer' },
          'lengthAtHook': { 'minimum': 0, 'type': 'integer' },
          'minHookErrors': { 'minimum': 0, 'type': 'integer' },
          'pushCount': { 'minimum': 0, 'type': 'integer' },
          'pushItemsLength': { 'minimum': 0, 'type': 'integer' },
          'rejectionCount': { 'minimum': 0, 'type': 'integer' },
          'result': { 'items': { 'type': 'number' }, 'type': 'array' },
          'returned': { 'type': 'string' },
          'secondShift': { 'type': 'number' },
          'shiftCount': { 'minimum': 0, 'type': 'integer' },
          'shiftItemsLength': { 'minimum': 0, 'type': 'integer' },
          'shiftLog': { 'items': { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] }, 'type': 'array' },
          'shiftValue': { 'type': 'number' },
          'shiftValues': { 'items': { 'type': 'number' }, 'type': 'array' },
          'state': {
            'additionalProperties': false,
            'properties': {
              'capacity': { 'minimum': 0, 'type': 'integer' },
              'head': { 'minimum': 0, 'type': 'integer' },
              'length': { 'minimum': 0, 'type': 'integer' },
              'tail': { 'minimum': 0, 'type': 'integer' }
            },
            'required': ['capacity', 'head', 'length', 'tail'],
            'type': 'object'
          }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'asyncOperations': {
            'items': {
              'additionalProperties': false,
              'properties': { 'method': { 'enum': ['push', 'unshift'] }, 'value': { 'type': 'number' } },
              'required': ['method', 'value'],
              'type': 'object'
            },
            'type': 'array'
          },
          'batch': {
            'additionalProperties': false,
            'properties': { 'pushStageCounts': { 'items': { 'minimum': 0, 'type': 'integer' }, 'type': 'array' }, 'shiftCount': { 'minimum': 0, 'type': 'integer' } },
            'required': [],
            'type': 'object'
          },
          'flushTurns': { 'minimum': 0, 'type': 'integer' },
          'options': CircularBufferOptionsEntity.Schema,
          'pushItems': { 'items': { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] }, 'type': 'array' },
          'pushValue': { 'type': 'number' }
        },
        'required': ['options'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'async-rejecting-onPush-guarded', 'base-class-operates-correctly-after-grow', 'create-returns-subclass',
          'full-trace-grow', 'full-trace-overwrite', 'grow-mode-all-hooks-active', 'onEvict-called-with-evicted-item',
          'onEvict-not-called-below-capacity', 'onEvict-receives-items-FIFO', 'onEvict-receives-oldest-item',
          'onGrow-called-once-per-grow-event', 'onGrow-called-when-capacity-exceeded', 'onGrow-not-called-in-overwrite-mode',
          'onGrow-receives-correct-old-new-capacity', 'onPush-called-on-each-overwrite-push', 'onPush-called-on-each-push',
          'onPush-called-on-grow-trigger', 'onPush-length-already-incremented', 'onShift-called-with-items-before-returned',
          'onShift-not-called-when-empty', 'onShift-receives-correct-item', 'onShift-return-value-matches-log',
          'reentrant-grow-throws-and-does-not-double-resize', 'reentrant-shift-throws', 'subclass-can-read-protected-state',
          'throwing-onEvict', 'throwing-onGrow', 'throwing-onOverflow', 'throwing-onPush', 'throwing-onShift'
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
      'expected': expectedNode,
      'input': inputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'async-rejecting-onPush-guarded', 'base-class-operates-correctly-after-grow', 'create-returns-subclass',
        'full-trace-grow', 'full-trace-overwrite', 'grow-mode-all-hooks-active', 'onEvict-called-with-evicted-item',
        'onEvict-not-called-below-capacity', 'onEvict-receives-items-FIFO', 'onEvict-receives-oldest-item',
        'onGrow-called-once-per-grow-event', 'onGrow-called-when-capacity-exceeded', 'onGrow-not-called-in-overwrite-mode',
        'onGrow-receives-correct-old-new-capacity', 'onPush-called-on-each-overwrite-push', 'onPush-called-on-each-push',
        'onPush-called-on-grow-trigger', 'onPush-length-already-incremented', 'onShift-called-with-items-before-returned',
        'onShift-not-called-when-empty', 'onShift-receives-correct-item', 'onShift-return-value-matches-log',
        'reentrant-grow-throws-and-does-not-double-resize', 'reentrant-shift-throws', 'subclass-can-read-protected-state',
        'throwing-onEvict', 'throwing-onGrow', 'throwing-onOverflow', 'throwing-onPush', 'throwing-onShift'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export type Type = NodeStaticType<typeof Node>;
}
