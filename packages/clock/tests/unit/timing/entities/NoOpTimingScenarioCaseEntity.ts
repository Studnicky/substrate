import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../../../../src/timing/constants/index.js';

/** The 2 distinct scenario shapes `NoOpTiming.loop.spec.ts` exercises. */
export namespace NoOpTimingScenarioCaseEntity {
  const timingStatusValues = [
    TIMING_STATUS.ABORT,
    TIMING_STATUS.ACQUIRED,
    TIMING_STATUS.COMPLETE,
    TIMING_STATUS.DEQUEUED,
    TIMING_STATUS.ERROR,
    TIMING_STATUS.HIT,
    TIMING_STATUS.MISS,
    TIMING_STATUS.QUEUED,
    TIMING_STATUS.RELEASED,
    TIMING_STATUS.START,
    TIMING_STATUS.TIMEOUT,
    TIMING_STATUS.WAITING
  ] as const;

  const timingStatusSchema = { 'enum': timingStatusValues } as const;

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'chainResult': { 'const': true },
              'durationMs': { 'const': 0 },
              'sameInstance': { 'const': true }
            },
            'required': ['chainResult', 'durationMs', 'sameInstance'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'event': {
                'additionalProperties': false,
                'properties': {
                  'component': { 'type': 'string' },
                  'operation': { 'type': 'string' },
                  'status': timingStatusSchema
                },
                'required': ['component', 'operation'],
                'type': 'object'
              }
            },
            'required': ['event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'create-clear-event-get-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'durationMs': { 'const': 0 },
              'empty': { 'const': true }
            },
            'required': ['durationMs', 'empty'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'get-events-empty' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'chainResult': SchemaNode.defineConst({}, true as const),
            'durationMs': SchemaNode.defineConst({}, 0 as const),
            'sameInstance': SchemaNode.defineConst({}, true as const)
          },
          ['chainResult', 'durationMs', 'sameInstance'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'event': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'component': SchemaNode.defineString({ 'type': 'string' } as const),
                'operation': SchemaNode.defineString({ 'type': 'string' } as const),
                'status': SchemaNode.defineEnum({}, timingStatusValues)
              },
              ['component', 'operation'] as const,
              { 'additionalProperties': false, 'patternProperties': {} }
            )
          },
          ['event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'create-clear-event-get-events' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'durationMs': SchemaNode.defineConst({}, 0 as const),
            'empty': SchemaNode.defineConst({}, true as const)
          },
          ['durationMs', 'empty'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
          'additionalProperties': false,
          'patternProperties': {}
        }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'get-events-empty' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    )
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
