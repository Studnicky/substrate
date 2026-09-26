import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BusQueueOptionsEntity } from '../../../src/entities/BusQueueOptionsEntity.js';

/** Flat scenario case for `EventBus.loop.spec.ts`. `expected` stays an open bag — each of the 32 shapes reads a different subset through `assert`'s own generic signature, never a cast. `bus`/`mutatedBus` reuse the real construction-options entity rather than re-describing `highWaterMark`. */
export namespace EventBusScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'afterClose': { 'type': 'string' },
          'beforeClose': { 'type': 'string' },
          'bus': BusQueueOptionsEntity.Schema,
          'countPayload': { 'type': 'number' },
          'cycles': { 'type': 'number' },
          'disposeCount': { 'type': 'number' },
          'errorMessage': { 'type': 'string' },
          'first': { 'type': 'string' },
          'firstId': { 'type': 'string' },
          'hookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
          'items': { 'items': { 'type': 'string' }, 'type': 'array' },
          'mutatedBus': BusQueueOptionsEntity.Schema,
          'payload': { 'type': 'string' },
          'payloadId': { 'type': 'string' },
          'pingPayload': { 'type': 'string' },
          'second': { 'type': 'string' },
          'secondId': { 'type': 'string' },
          'topic': { 'enum': ['count', 'order:created', 'order:updated', 'ping', 'x'] },
          'topics': { 'items': { 'enum': ['count', 'order:created', 'order:updated', 'ping', 'x'] }, 'type': 'array' },
          'unhandledRejections': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'async-owned-queue-hooks', 'async-subscription-hooks', 'close-stops-delivery', 'config-snapshot',
          'default-hwm', 'enqueue-dequeue-hooks', 'forwarded-hwm', 'handler-signal', 'hook-order',
          'multiple-subscribers', 'on-deliver', 'on-dispose', 'on-drop-noop', 'on-handler-error', 'on-publish',
          'on-subscribe', 'on-unsubscribe', 'owned-queues-isolated', 'pending-admission-order',
          'preaborted-caller-signal', 'publish-delivers', 'publish-empty-topic', 'same-depth-no-overflow',
          'signal-after-close', 'signal-after-unsubscribe', 'signal-listener-cleanup', 'subscribe-after-close',
          'throwing-on-deliver', 'throwing-on-publish', 'topic-entry-cleanup', 'topic-entry-kept', 'topics-isolated',
          'unsubscribe-stops'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const TopicNode = SchemaNode.defineEnum({}, ['count', 'order:created', 'order:updated', 'ping', 'x'] as const);

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'afterClose': SchemaNode.defineString({ 'type': 'string' } as const),
          'beforeClose': SchemaNode.defineString({ 'type': 'string' } as const),
          'bus': BusQueueOptionsEntity.Node,
          'countPayload': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'cycles': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'disposeCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'first': SchemaNode.defineString({ 'type': 'string' } as const),
          'firstId': SchemaNode.defineString({ 'type': 'string' } as const),
          'hookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'mutatedBus': BusQueueOptionsEntity.Node,
          'payload': SchemaNode.defineString({ 'type': 'string' } as const),
          'payloadId': SchemaNode.defineString({ 'type': 'string' } as const),
          'pingPayload': SchemaNode.defineString({ 'type': 'string' } as const),
          'second': SchemaNode.defineString({ 'type': 'string' } as const),
          'secondId': SchemaNode.defineString({ 'type': 'string' } as const),
          'topic': TopicNode,
          'topics': SchemaNode.defineArray({ 'type': 'array' } as const, TopicNode, undefined),
          'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'async-owned-queue-hooks', 'async-subscription-hooks', 'close-stops-delivery', 'config-snapshot',
        'default-hwm', 'enqueue-dequeue-hooks', 'forwarded-hwm', 'handler-signal', 'hook-order',
        'multiple-subscribers', 'on-deliver', 'on-dispose', 'on-drop-noop', 'on-handler-error', 'on-publish',
        'on-subscribe', 'on-unsubscribe', 'owned-queues-isolated', 'pending-admission-order',
        'preaborted-caller-signal', 'publish-delivers', 'publish-empty-topic', 'same-depth-no-overflow',
        'signal-after-close', 'signal-after-unsubscribe', 'signal-listener-cleanup', 'subscribe-after-close',
        'throwing-on-deliver', 'throwing-on-publish', 'topic-entry-cleanup', 'topic-entry-kept', 'topics-isolated',
        'unsubscribe-stops'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
