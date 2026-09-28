import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Flat scenario case for `BusQueue.loop.spec.ts`. `expected` stays an open bag — each of the 23 shapes reads a different subset through `assert`'s own generic signature, never a cast. `input.items`/`input.item` are genuinely polymorphic (`number | string`) across shapes and are narrowed by the spec's own runtime guards. */
export namespace BusQueueScenarioCaseEntity {
  const itemSchema = { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'errorMessage': { 'type': 'string' },
          'flushMicrotasks': { 'type': 'number' },
          'handlerErrorMessage': { 'type': 'string' },
          'highWaterMark': { 'type': 'number' },
          'item': itemSchema,
          'items': { 'items': itemSchema, 'type': 'array' },
          'onErrorMessage': { 'type': 'string' },
          'options': {},
          'throwOn': { 'type': 'number' },
          'total': { 'type': 'number' },
          'values': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'admission-and-overflow-order', 'admission-hook-on-hook-error', 'abort-initially-cancelled',
          'abort-mid-drain-fires-exactly-once', 'abort-releases-drain-waiter', 'abort-releases-pending',
          'abort-signal-cancels', 'async-on-error-swallowed', 'drain-empty-immediate', 'drain-empties',
          'fifo-order', 'handler-error-hook', 'handler-order', 'high-water-mark-validation', 'missing-handler',
          'on-drop-noop', 'on-enqueue-hook', 'on-error-continues', 'overflow-hook-fires', 'rejecting-enqueue-hook',
          'rejecting-overflow-hook', 'single-drain-loop', 'size-before-drain', 'throwing-dequeue-hook'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ItemNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const)
  ] as const);

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'flushMicrotasks': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'handlerErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'highWaterMark': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'item': ItemNode,
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
          'onErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'options': SchemaNode.defineUnknown({} as const),
          'throwOn': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'total': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'admission-and-overflow-order', 'admission-hook-on-hook-error', 'abort-initially-cancelled',
        'abort-mid-drain-fires-exactly-once', 'abort-releases-drain-waiter', 'abort-releases-pending',
        'abort-signal-cancels', 'async-on-error-swallowed', 'drain-empty-immediate', 'drain-empties',
        'fifo-order', 'handler-error-hook', 'handler-order', 'high-water-mark-validation', 'missing-handler',
        'on-drop-noop', 'on-enqueue-hook', 'on-error-continues', 'overflow-hook-fires', 'rejecting-enqueue-hook',
        'rejecting-overflow-hook', 'single-drain-loop', 'size-before-drain', 'throwing-dequeue-hook'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
