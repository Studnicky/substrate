import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const itemSchema = { 'oneOf': [{ 'type': 'number' }, { 'type': 'string' }] } as const;
const ItemNode = SchemaNode.defineOneOf({}, [
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'type': 'string' } as const)
] as const);

/** Builds the per-shape variants of the scenario case; every shape shares one `input` and one open `expected` contract. */
class BusQueueScenarioBuilders {
  static variantSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
        'input': BusQueueScenarioBuilders.inputSchema(),
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
        'input': BusQueueScenarioBuilders.inputNode(),
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
    } as const;
    return result;
  }

  private static inputNode() {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
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
        'values': SchemaNode.defineArray(
          { 'type': 'array' } as const,
          SchemaNode.defineNumber({ 'type': 'number' } as const),
          undefined
        )
      },
      [] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

/** Scenario cases for `BusQueue.loop.spec.ts`. `expected` stays an open object — each of the 23 shapes reads a different subset through `assert`'s own generic signature, never a cast. `input.items`/`input.item` are genuinely polymorphic (`number | string`) across shapes and are narrowed by the spec's own runtime guards. */
export namespace BusQueueScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      BusQueueScenarioBuilders.variantSchema('admission-and-overflow-order'),
      BusQueueScenarioBuilders.variantSchema('admission-hook-on-hook-error'),
      BusQueueScenarioBuilders.variantSchema('abort-initially-cancelled'),
      BusQueueScenarioBuilders.variantSchema('abort-mid-drain-fires-exactly-once'),
      BusQueueScenarioBuilders.variantSchema('abort-releases-drain-waiter'),
      BusQueueScenarioBuilders.variantSchema('abort-releases-pending'),
      BusQueueScenarioBuilders.variantSchema('abort-signal-cancels'),
      BusQueueScenarioBuilders.variantSchema('async-on-error-swallowed'),
      BusQueueScenarioBuilders.variantSchema('drain-empty-immediate'),
      BusQueueScenarioBuilders.variantSchema('drain-empties'),
      BusQueueScenarioBuilders.variantSchema('fifo-order'),
      BusQueueScenarioBuilders.variantSchema('handler-error-hook'),
      BusQueueScenarioBuilders.variantSchema('handler-order'),
      BusQueueScenarioBuilders.variantSchema('high-water-mark-validation'),
      BusQueueScenarioBuilders.variantSchema('missing-handler'),
      BusQueueScenarioBuilders.variantSchema('on-drop-noop'),
      BusQueueScenarioBuilders.variantSchema('on-enqueue-hook'),
      BusQueueScenarioBuilders.variantSchema('on-error-continues'),
      BusQueueScenarioBuilders.variantSchema('overflow-hook-fires'),
      BusQueueScenarioBuilders.variantSchema('rejecting-enqueue-hook'),
      BusQueueScenarioBuilders.variantSchema('rejecting-overflow-hook'),
      BusQueueScenarioBuilders.variantSchema('single-drain-loop'),
      BusQueueScenarioBuilders.variantSchema('size-before-drain'),
      BusQueueScenarioBuilders.variantSchema('throwing-dequeue-hook')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    BusQueueScenarioBuilders.variantNode('admission-and-overflow-order'),
    BusQueueScenarioBuilders.variantNode('admission-hook-on-hook-error'),
    BusQueueScenarioBuilders.variantNode('abort-initially-cancelled'),
    BusQueueScenarioBuilders.variantNode('abort-mid-drain-fires-exactly-once'),
    BusQueueScenarioBuilders.variantNode('abort-releases-drain-waiter'),
    BusQueueScenarioBuilders.variantNode('abort-releases-pending'),
    BusQueueScenarioBuilders.variantNode('abort-signal-cancels'),
    BusQueueScenarioBuilders.variantNode('async-on-error-swallowed'),
    BusQueueScenarioBuilders.variantNode('drain-empty-immediate'),
    BusQueueScenarioBuilders.variantNode('drain-empties'),
    BusQueueScenarioBuilders.variantNode('fifo-order'),
    BusQueueScenarioBuilders.variantNode('handler-error-hook'),
    BusQueueScenarioBuilders.variantNode('handler-order'),
    BusQueueScenarioBuilders.variantNode('high-water-mark-validation'),
    BusQueueScenarioBuilders.variantNode('missing-handler'),
    BusQueueScenarioBuilders.variantNode('on-drop-noop'),
    BusQueueScenarioBuilders.variantNode('on-enqueue-hook'),
    BusQueueScenarioBuilders.variantNode('on-error-continues'),
    BusQueueScenarioBuilders.variantNode('overflow-hook-fires'),
    BusQueueScenarioBuilders.variantNode('rejecting-enqueue-hook'),
    BusQueueScenarioBuilders.variantNode('rejecting-overflow-hook'),
    BusQueueScenarioBuilders.variantNode('single-drain-loop'),
    BusQueueScenarioBuilders.variantNode('size-before-drain'),
    BusQueueScenarioBuilders.variantNode('throwing-dequeue-hook')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
