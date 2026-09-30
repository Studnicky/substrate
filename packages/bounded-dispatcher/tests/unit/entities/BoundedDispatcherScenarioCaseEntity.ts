import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SemaphoreOptionsEntity } from '@studnicky/concurrency/entities';
import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { BusQueueOptionsEntity } from '@studnicky/event-bus/entities';

/** The `bounded-dispatcher.loop.spec.ts` scenario case shape. `expected` stays an open bag — each of the fourteen shapes reads a different subset via `String()`/`Number()`/`Boolean()` coercion, never a cast. */
export namespace BoundedDispatcherScenarioCaseEntity {
  const busDescriptorSchema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'default' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': { 'options': { ...BusQueueOptionsEntity.Schema, 'required': [] }, 'shape': { 'const': 'options' } },
        'required': ['options', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': { 'failureOrdinal': { 'type': 'number' }, 'shape': { 'const': 'rejecting' } },
        'required': ['failureOrdinal', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  const schedulerDescriptorSchema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'default' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': {
          'counter': {
            'additionalProperties': false,
            'properties': { 'startMs': { 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'shape': { 'const': 'virtual' }
        },
        'required': ['counter', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  const dispatcherConfigSchema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'bus': busDescriptorSchema,
      'options': {
        'additionalProperties': false,
        'properties': { 'semaphore': SemaphoreOptionsEntity.Schema },
        'required': [],
        'type': 'object'
      },
      'scheduler': schedulerDescriptorSchema
    },
    'required': ['bus', 'options', 'scheduler'],
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
          'batch': {
            'additionalProperties': false,
            'properties': { 'labels': { 'items': { 'type': 'string' }, 'type': 'array' }, 'taskCount': { 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'dispatcher': dispatcherConfigSchema,
          'errorMessage': { 'type': 'string' },
          'fireResult': { 'type': 'string' },
          'mutatedValue': { 'type': 'number' },
          'publicationCauseMessage': { 'type': 'string' },
          'publicationCauseValue': { 'type': 'number' },
          'result': { 'type': 'string' },
          'workErrorMessage': { 'type': 'string' }
        },
        'required': ['dispatcher'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'backpressure-isolation', 'dispatch-concurrency-bound', 'dispatch-error', 'dispatch-serializes', 'dispatch-success',
          'reject-error-publication', 'reject-start-publication', 'reject-success-publication', 'injected-semaphore-abort',
          'injected-semaphore-queue-cap', 'schedule-cancel', 'schedule-fires', 'schedule-uses-dispatch', 'snapshot-hook-failures'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const BusDescriptorNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'default' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': BusQueueOptionsEntity.Node, 'shape': SchemaNode.defineConst({}, 'options' as const) }, ['options', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureOrdinal': SchemaNode.defineNumber({ 'type': 'number' } as const), 'shape': SchemaNode.defineConst({}, 'rejecting' as const) }, ['failureOrdinal', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  const SchedulerDescriptorNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'default' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'counter': SchemaNode.defineObject({ 'type': 'object' } as const, { 'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'virtual' as const)
    }, ['counter', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  const DispatcherConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'bus': BusDescriptorNode,
    'options': SchemaNode.defineObject({ 'type': 'object' } as const, { 'semaphore': SemaphoreOptionsEntity.Node }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'scheduler': SchedulerDescriptorNode
  }, ['bus', 'options', 'scheduler'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'labels': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'taskCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'dispatcher': DispatcherConfigNode,
      'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'fireResult': SchemaNode.defineString({ 'type': 'string' } as const),
      'mutatedValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'publicationCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'publicationCauseValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'result': SchemaNode.defineString({ 'type': 'string' } as const),
      'workErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineEnum({}, [
      'backpressure-isolation', 'dispatch-concurrency-bound', 'dispatch-error', 'dispatch-serializes', 'dispatch-success',
      'reject-error-publication', 'reject-start-publication', 'reject-success-publication', 'injected-semaphore-abort',
      'injected-semaphore-queue-cap', 'schedule-cancel', 'schedule-fires', 'schedule-uses-dispatch', 'snapshot-hook-failures'
    ] as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
