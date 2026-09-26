import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../../../src/constants/index.js';

/** The 7 distinct scenario shapes `TimingEvent.loop.spec.ts` exercises. */
export namespace TimingEventScenarioCaseEntity {
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

  const eventInputSchema = {
    'additionalProperties': false,
    'properties': { 'component': { 'type': 'string' }, 'operation': { 'type': 'string' } },
    'required': ['component', 'operation'],
    'type': 'object'
  } as const;

  const eventInputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'component': SchemaNode.defineString({ 'type': 'string' } as const), 'operation': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['component', 'operation'] as const,
    { 'additionalProperties': false }
  );

  const eventWithStatusInputSchema = {
    'additionalProperties': false,
    'properties': { 'component': { 'type': 'string' }, 'operation': { 'type': 'string' }, 'status': timingStatusSchema },
    'required': ['component', 'operation', 'status'],
    'type': 'object'
  } as const;

  const eventWithStatusInputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'component': SchemaNode.defineString({ 'type': 'string' } as const),
      'operation': SchemaNode.defineString({ 'type': 'string' } as const),
      'status': SchemaNode.defineEnum(timingStatusValues)
    },
    ['component', 'operation', 'status'] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'event': { 'type': 'string' } },
            'required': ['event'],
            'type': 'object'
          },
          'input': eventInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'component-operation-format' }
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
            'properties': { 'event': { 'type': 'string' } },
            'required': ['event'],
            'type': 'object'
          },
          'input': eventWithStatusInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'domain-specific-status' }
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
            'properties': { 'frozen': { 'const': true } },
            'required': ['frozen'],
            'type': 'object'
          },
          'input': eventInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'immutable-event-data' }
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
            'properties': { 'event': { 'type': 'string' } },
            'required': ['event'],
            'type': 'object'
          },
          'input': eventWithStatusInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'includes-status' }
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
            'properties': { 'firstEvent': { 'type': 'string' }, 'secondEvent': { 'type': 'string' } },
            'required': ['firstEvent', 'secondEvent'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'first': eventInputSchema, 'second': eventInputSchema },
            'required': ['first', 'second'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'independent-event-values' }
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
            'properties': { 'errorName': { 'type': 'string' } },
            'required': ['errorName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'operation': { 'type': 'string' } },
            'required': ['operation'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'missing-component' }
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
            'properties': { 'errorName': { 'type': 'string' } },
            'required': ['errorName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'component': { 'type': 'string' } },
            'required': ['component'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'missing-operation' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'event': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['event'] as const,
          { 'additionalProperties': false }
        ),
        'input': eventInputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('component-operation-format' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'event': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['event'] as const,
          { 'additionalProperties': false }
        ),
        'input': eventWithStatusInputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('domain-specific-status' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'frozen': SchemaNode.defineConst(true as const) },
          ['frozen'] as const,
          { 'additionalProperties': false }
        ),
        'input': eventInputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('immutable-event-data' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'event': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['event'] as const,
          { 'additionalProperties': false }
        ),
        'input': eventWithStatusInputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('includes-status' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'firstEvent': SchemaNode.defineString({ 'type': 'string' } as const),
            'secondEvent': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['firstEvent', 'secondEvent'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'first': eventInputNode, 'second': eventInputNode },
          ['first', 'second'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('independent-event-values' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['errorName'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'operation': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['operation'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('missing-component' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['errorName'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'component': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['component'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('missing-operation' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export type Type = NodeStaticType<typeof Node>;
}
