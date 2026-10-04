import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { BusQueueOptionsEntity } from '@studnicky/concurrency/queue/entities';
import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const TopicNode = SchemaNode.defineEnum({}, [
  'count',
  'order:created',
  'order:updated',
  'ping',
  'x'
] as const);

/** Builds the per-shape variants of the scenario case; every shape shares one `input` and one open `expected` contract. */
class EventBusScenarioBuilders {
  static variantSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
        'input': EventBusScenarioBuilders.inputSchema(),
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static variantNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
          'additionalProperties': true,
          'patternProperties': {}
        }),
        'input': EventBusScenarioBuilders.inputNode(),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }

  private static inputSchema() {
    const result = {
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
        'topics': {
          'items': { 'enum': ['count', 'order:created', 'order:updated', 'ping', 'x'] },
          'type': 'array'
        },
        'unhandledRejections': { 'type': 'number' }
      },
      'required': [],
      'type': 'object'
    } as const;
    return result;
  }

  private static inputNode() {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'afterClose': SchemaNode.defineString({ 'type': 'string' } as const),
        'beforeClose': SchemaNode.defineString({ 'type': 'string' } as const),
        'bus': BusQueueOptionsEntity.Node,
        'countPayload': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'cycles': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'disposeCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'first': SchemaNode.defineString({ 'type': 'string' } as const),
        'firstId': SchemaNode.defineString({ 'type': 'string' } as const),
        'hookNames': SchemaNode.defineArray(
          { 'type': 'array' } as const,
          SchemaNode.defineString({ 'type': 'string' } as const),
          undefined
        ),
        'items': SchemaNode.defineArray(
          { 'type': 'array' } as const,
          SchemaNode.defineString({ 'type': 'string' } as const),
          undefined
        ),
        'mutatedBus': BusQueueOptionsEntity.Node,
        'payload': SchemaNode.defineString({ 'type': 'string' } as const),
        'payloadId': SchemaNode.defineString({ 'type': 'string' } as const),
        'pingPayload': SchemaNode.defineString({ 'type': 'string' } as const),
        'second': SchemaNode.defineString({ 'type': 'string' } as const),
        'secondId': SchemaNode.defineString({ 'type': 'string' } as const),
        'topic': TopicNode,
        'topics': SchemaNode.defineArray({ 'type': 'array' } as const, TopicNode, undefined),
        'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
      },
      [] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

/** Scenario cases for `EventBus.loop.spec.ts`. `expected` stays an open object — each of the 32 shapes reads a different subset through `assert`'s own generic signature, never a cast. `bus`/`mutatedBus` reuse the real construction-options entity rather than re-describing `highWaterMark`. */
export namespace EventBusScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      EventBusScenarioBuilders.variantSchema('async-owned-queue-hooks'),
      EventBusScenarioBuilders.variantSchema('async-subscription-hooks'),
      EventBusScenarioBuilders.variantSchema('close-stops-delivery'),
      EventBusScenarioBuilders.variantSchema('config-snapshot'),
      EventBusScenarioBuilders.variantSchema('default-hwm'),
      EventBusScenarioBuilders.variantSchema('enqueue-dequeue-hooks'),
      EventBusScenarioBuilders.variantSchema('forwarded-hwm'),
      EventBusScenarioBuilders.variantSchema('handler-signal'),
      EventBusScenarioBuilders.variantSchema('hook-order'),
      EventBusScenarioBuilders.variantSchema('multiple-subscribers'),
      EventBusScenarioBuilders.variantSchema('on-deliver'),
      EventBusScenarioBuilders.variantSchema('on-dispose'),
      EventBusScenarioBuilders.variantSchema('on-drop-noop'),
      EventBusScenarioBuilders.variantSchema('on-handler-error'),
      EventBusScenarioBuilders.variantSchema('on-publish'),
      EventBusScenarioBuilders.variantSchema('on-subscribe'),
      EventBusScenarioBuilders.variantSchema('on-unsubscribe'),
      EventBusScenarioBuilders.variantSchema('owned-queues-isolated'),
      EventBusScenarioBuilders.variantSchema('pending-admission-order'),
      EventBusScenarioBuilders.variantSchema('preaborted-caller-signal'),
      EventBusScenarioBuilders.variantSchema('publish-delivers'),
      EventBusScenarioBuilders.variantSchema('publish-empty-topic'),
      EventBusScenarioBuilders.variantSchema('same-depth-no-overflow'),
      EventBusScenarioBuilders.variantSchema('signal-after-close'),
      EventBusScenarioBuilders.variantSchema('signal-after-unsubscribe'),
      EventBusScenarioBuilders.variantSchema('signal-listener-cleanup'),
      EventBusScenarioBuilders.variantSchema('subscribe-after-close'),
      EventBusScenarioBuilders.variantSchema('throwing-on-deliver'),
      EventBusScenarioBuilders.variantSchema('throwing-on-publish'),
      EventBusScenarioBuilders.variantSchema('topic-entry-cleanup'),
      EventBusScenarioBuilders.variantSchema('topic-entry-kept'),
      EventBusScenarioBuilders.variantSchema('topics-isolated'),
      EventBusScenarioBuilders.variantSchema('unsubscribe-stops')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    EventBusScenarioBuilders.variantNode('async-owned-queue-hooks'),
    EventBusScenarioBuilders.variantNode('async-subscription-hooks'),
    EventBusScenarioBuilders.variantNode('close-stops-delivery'),
    EventBusScenarioBuilders.variantNode('config-snapshot'),
    EventBusScenarioBuilders.variantNode('default-hwm'),
    EventBusScenarioBuilders.variantNode('enqueue-dequeue-hooks'),
    EventBusScenarioBuilders.variantNode('forwarded-hwm'),
    EventBusScenarioBuilders.variantNode('handler-signal'),
    EventBusScenarioBuilders.variantNode('hook-order'),
    EventBusScenarioBuilders.variantNode('multiple-subscribers'),
    EventBusScenarioBuilders.variantNode('on-deliver'),
    EventBusScenarioBuilders.variantNode('on-dispose'),
    EventBusScenarioBuilders.variantNode('on-drop-noop'),
    EventBusScenarioBuilders.variantNode('on-handler-error'),
    EventBusScenarioBuilders.variantNode('on-publish'),
    EventBusScenarioBuilders.variantNode('on-subscribe'),
    EventBusScenarioBuilders.variantNode('on-unsubscribe'),
    EventBusScenarioBuilders.variantNode('owned-queues-isolated'),
    EventBusScenarioBuilders.variantNode('pending-admission-order'),
    EventBusScenarioBuilders.variantNode('preaborted-caller-signal'),
    EventBusScenarioBuilders.variantNode('publish-delivers'),
    EventBusScenarioBuilders.variantNode('publish-empty-topic'),
    EventBusScenarioBuilders.variantNode('same-depth-no-overflow'),
    EventBusScenarioBuilders.variantNode('signal-after-close'),
    EventBusScenarioBuilders.variantNode('signal-after-unsubscribe'),
    EventBusScenarioBuilders.variantNode('signal-listener-cleanup'),
    EventBusScenarioBuilders.variantNode('subscribe-after-close'),
    EventBusScenarioBuilders.variantNode('throwing-on-deliver'),
    EventBusScenarioBuilders.variantNode('throwing-on-publish'),
    EventBusScenarioBuilders.variantNode('topic-entry-cleanup'),
    EventBusScenarioBuilders.variantNode('topic-entry-kept'),
    EventBusScenarioBuilders.variantNode('topics-isolated'),
    EventBusScenarioBuilders.variantNode('unsubscribe-stops')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
