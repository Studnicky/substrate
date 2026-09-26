import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 12 scenario shapes `HealthRegistryHooks.loop.spec.ts` exercises. */
export namespace HealthRegistryHooksScenarioCaseEntity {
  const healthStatusSchema = { 'enum': ['healthy', 'degraded', 'unhealthy'], 'type': 'string' } as const;
  const HealthStatusNode = SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'degraded', 'unhealthy'] as const);

  const checkNameStatusSchema = {
    'additionalProperties': false,
    'properties': { 'name': { 'type': 'string' }, 'status': healthStatusSchema },
    'required': ['name', 'status'],
    'type': 'object'
  } as const;
  const CheckNameStatusNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': HealthStatusNode },
    ['name', 'status'] as const,
    { 'additionalProperties': false }
  );

  const namedChecksArraySchema = { 'items': checkNameStatusSchema, 'type': 'array' } as const;
  const NamedChecksArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, CheckNameStatusNode);

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'registeredCalls': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['registeredCalls'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': namedChecksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-check-registered' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'resultCalls': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'metadata': {}, 'name': { 'type': 'string' }, 'status': healthStatusSchema },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['resultCalls'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'checks': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'metadata': {}, 'name': { 'type': 'string' }, 'status': healthStatusSchema },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['checks'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-check-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'resultCalls': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'unhealthy' } },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['resultCalls'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'name': { 'type': 'string' } },
            'required': ['errorMessage', 'name'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'rejecting-check-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'resultStatus': { 'const': 'unhealthy' },
              'timeoutCalls': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
                  'required': ['name', 'timeoutMs'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['resultStatus', 'timeoutCalls'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'delayMs': { 'type': 'number' },
              'name': { 'type': 'string' },
              'status': { 'const': 'healthy' },
              'timeoutMs': { 'type': 'number' }
            },
            'required': ['delayMs', 'name', 'status', 'timeoutMs'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'timeout-plus-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'resultStatus': { 'const': 'healthy' }, 'timeoutCount': { 'const': 0 } },
            'required': ['resultStatus', 'timeoutCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'delayMs': { 'type': 'number' },
              'name': { 'type': 'string' },
              'status': { 'const': 'healthy' },
              'timeoutMs': { 'type': 'number' }
            },
            'required': ['delayMs', 'name', 'status', 'timeoutMs'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'no-timeout-after-fast-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'aggregateCalls': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'overall': healthStatusSchema, 'size': { 'type': 'number' } },
                  'required': ['overall', 'size'],
                  'type': 'object'
                },
                'type': 'array'
              },
              'aggregateCountAfterFirst': { 'type': 'number' },
              'aggregateCountAfterSecond': { 'type': 'number' }
            },
            'required': ['aggregateCalls', 'aggregateCountAfterFirst', 'aggregateCountAfterSecond'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': namedChecksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-aggregate-after-settle' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'order': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['order'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'healthy' } },
            'required': ['name', 'status'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hook-order' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'resultStatus': { 'const': 'healthy' } }, 'required': ['resultStatus'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'healthy' } },
            'required': ['name', 'status'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'throwing-on-check-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'resultStatus': { 'const': 'degraded' } }, 'required': ['resultStatus'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'degraded' } },
            'required': ['name', 'status'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'throwing-on-aggregate' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'errorCount': { 'const': 1 }, 'hookName': { 'const': 'onCheckRegistered' } },
            'required': ['errorCount', 'hookName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'firstCause': { 'type': 'string' }, 'secondCause': { 'type': 'string' } },
            'required': ['firstCause', 'secondCause'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hook-errors-owned-by-instance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorCount': { 'const': 1 },
              'message': { 'type': 'string' },
              'nestedChecks': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['errorCount', 'message', 'nestedChecks'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'causeMessage': { 'type': 'string' },
              'mutateChecks': { 'items': { 'type': 'string' }, 'type': 'array' },
              'nestedChecks': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['causeMessage', 'mutateChecks', 'nestedChecks'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'deeply-detached-hook-errors' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'hookErrorCount': { 'const': 1 },
              'hookName': { 'const': 'onAggregate' },
              'rejectionCount': { 'const': 0 },
              'resultStatus': { 'const': 'healthy' }
            },
            'required': ['hookErrorCount', 'hookName', 'rejectionCount', 'resultStatus'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'healthy' }, 'waitMs': { 'type': 'number' } },
            'required': ['name', 'status', 'waitMs'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'async-aggregate-rejection' }
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
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'registeredCalls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['registeredCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': NamedChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('on-check-registered' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resultCalls': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'metadata': SchemaNode.defineUnknown({} as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': HealthStatusNode },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            )
          },
          ['resultCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'checks': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'metadata': SchemaNode.defineUnknown({} as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': HealthStatusNode },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            )
          },
          ['checks'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('on-check-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resultCalls': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineConst('unhealthy' as const) },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            )
          },
          ['resultCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['errorMessage', 'name'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('rejecting-check-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resultStatus': SchemaNode.defineConst('unhealthy' as const),
            'timeoutCalls': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                ['name', 'timeoutMs'] as const,
                { 'additionalProperties': false }
              )
            )
          },
          ['resultStatus', 'timeoutCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'name': SchemaNode.defineString({ 'type': 'string' } as const),
            'status': SchemaNode.defineConst('healthy' as const),
            'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['delayMs', 'name', 'status', 'timeoutMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('timeout-plus-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'resultStatus': SchemaNode.defineConst('healthy' as const), 'timeoutCount': SchemaNode.defineConst(0 as const) },
          ['resultStatus', 'timeoutCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'name': SchemaNode.defineString({ 'type': 'string' } as const),
            'status': SchemaNode.defineConst('healthy' as const),
            'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['delayMs', 'name', 'status', 'timeoutMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('no-timeout-after-fast-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'aggregateCalls': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'overall': HealthStatusNode, 'size': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                ['overall', 'size'] as const,
                { 'additionalProperties': false }
              )
            ),
            'aggregateCountAfterFirst': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'aggregateCountAfterSecond': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['aggregateCalls', 'aggregateCountAfterFirst', 'aggregateCountAfterSecond'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': NamedChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('on-aggregate-after-settle' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['order'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineConst('healthy' as const) },
          ['name', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-order' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'resultStatus': SchemaNode.defineConst('healthy' as const) },
          ['resultStatus'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineConst('healthy' as const) },
          ['name', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('throwing-on-check-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'resultStatus': SchemaNode.defineConst('degraded' as const) },
          ['resultStatus'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineConst('degraded' as const) },
          ['name', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('throwing-on-aggregate' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'errorCount': SchemaNode.defineConst(1 as const), 'hookName': SchemaNode.defineConst('onCheckRegistered' as const) },
          ['errorCount', 'hookName'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'firstCause': SchemaNode.defineString({ 'type': 'string' } as const), 'secondCause': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['firstCause', 'secondCause'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-errors-owned-by-instance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'errorCount': SchemaNode.defineConst(1 as const),
            'message': SchemaNode.defineString({ 'type': 'string' } as const),
            'nestedChecks': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
          },
          ['errorCount', 'message', 'nestedChecks'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'mutateChecks': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
            'nestedChecks': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
          },
          ['causeMessage', 'mutateChecks', 'nestedChecks'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('deeply-detached-hook-errors' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookErrorCount': SchemaNode.defineConst(1 as const),
            'hookName': SchemaNode.defineConst('onAggregate' as const),
            'rejectionCount': SchemaNode.defineConst(0 as const),
            'resultStatus': SchemaNode.defineConst('healthy' as const)
          },
          ['hookErrorCount', 'hookName', 'rejectionCount', 'resultStatus'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'name': SchemaNode.defineString({ 'type': 'string' } as const),
            'status': SchemaNode.defineConst('healthy' as const),
            'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['name', 'status', 'waitMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('async-aggregate-rejection' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export type Type = NodeStaticType<typeof Node>;
}
