import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../../../../src/timing/constants/index.js';

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

const eventFixtureNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'component': SchemaNode.defineString({ 'type': 'string' } as const),
    'operation': SchemaNode.defineString({ 'type': 'string' } as const),
    'status': SchemaNode.defineEnum({}, timingStatusValues)
  },
  ['component', 'operation'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

export namespace TimingScenarioCaseNodePart {
  export const Node = [
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'evictCountAtLeast': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['evictCountAtLeast'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined),
            'timing': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) },
              ['maximumEvents'] as const,
              { 'additionalProperties': false, 'patternProperties': {} }
            )
          },
          ['events', 'timing'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onEvict-hook-called' as const)
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
            'getEventsCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'lastEventCounts': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineNumber({ 'type': 'number' } as const),
              undefined
            )
          },
          ['getEventsCount', 'lastEventCounts'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) },
          ['events'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onGetEvents-hook-fires' as const)
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
            'initCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'startTimeType': SchemaNode.defineConst({}, 'bigint' as const)
          },
          ['initCount', 'startTimeType'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'construct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
          ['construct'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onInitialize-hook-fires' as const)
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
            'keys': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            )
          },
          ['keys'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) },
          ['events'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'optional-status' as const)
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
          { 'readCountDelta': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['readCountDelta'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'event': eventFixtureNode },
          ['event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'read-hrtime-called' as const)
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
          { 'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
          ['sameReference'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'event': eventFixtureNode },
          ['event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'returns-new-object' as const)
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
            'keys': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'uniqueCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['keys', 'uniqueCount'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'event': eventFixtureNode
          },
          ['busyWaitMs', 'event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'same-name-events' as const)
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
            'hasInitialize': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'minDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['hasInitialize', 'minDurationMs'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['busyWaitMs'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'starts-immediately' as const)
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
          { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) },
          ['errorName'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'event': eventFixtureNode
          },
          ['errorMessage', 'event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onClear' as const)
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
          { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) },
          ['errorName'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'event': eventFixtureNode
          },
          ['errorMessage', 'event'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onEvent' as const)
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
          { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) },
          ['errorName'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'event': eventFixtureNode,
            'timing': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) },
              ['maximumEvents'] as const,
              { 'additionalProperties': false, 'patternProperties': {} }
            )
          },
          ['errorMessage', 'event', 'timing'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onEvict' as const)
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
          { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) },
          ['errorName'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['errorMessage'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onGetEvents' as const)
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
          { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) },
          ['errorName'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['errorMessage'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onInitialize' as const)
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
            'keys': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            )
          },
          ['keys'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) },
          ['events'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'timing-status-constants' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    )
  ] as const;

}
