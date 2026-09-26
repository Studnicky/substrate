import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 10 scenario shapes `HealthRegistry.loop.spec.ts` exercises. */
export namespace HealthRegistryScenarioCaseEntity {
  const healthStatusSchema = { 'enum': ['healthy', 'degraded', 'unhealthy'], 'type': 'string' } as const;
  const HealthStatusNode = SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'degraded', 'unhealthy'] as const);

  const checkOutcomeSchema = { 'enum': ['healthy', 'late-throw', 'throw', 'timeout'], 'type': 'string' } as const;
  const CheckOutcomeNode = SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'late-throw', 'throw', 'timeout'] as const);

  const checkDefinitionSchema = {
    'additionalProperties': false,
    'properties': {
      'delayMs': { 'type': 'number' },
      'metadata': { 'additionalProperties': { 'type': 'string' }, 'properties': {}, 'type': 'object' },
      'name': { 'type': 'string' },
      'outcome': checkOutcomeSchema,
      'status': healthStatusSchema,
      'timeoutMs': { 'type': 'number' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  const CheckDefinitionNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const) }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': CheckOutcomeNode,
      'status': HealthStatusNode,
      'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['name'] as const,
    { 'additionalProperties': false }
  );

  const emptyChecksSchema = { 'maxItems': 0, 'prefixItems': [], 'type': 'array' } as const;
  const EmptyChecksNode = SchemaNode.defineTuple({ 'maxItems': 0, 'type': 'array' } as const, [] as const);

  const checksArraySchema = { 'items': checkDefinitionSchema, 'type': 'array' } as const;
  const ChecksArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, CheckDefinitionNode);

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'resultCount': { 'type': 'number' }, 'status': { 'const': 'healthy' } },
            'required': ['resultCount', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': emptyChecksSchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'empty-registry-healthy' }
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
              'results': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'status': { 'const': 'healthy' } },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              },
              'status': { 'const': 'healthy' }
            },
            'required': ['results', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'all-healthy' }
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
              'results': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'status': { 'enum': ['healthy', 'degraded'], 'type': 'string' } },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              },
              'status': { 'const': 'degraded' }
            },
            'required': ['results', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'one-degraded' }
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
              'results': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'status': healthStatusSchema },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              },
              'status': { 'const': 'unhealthy' }
            },
            'required': ['results', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'one-unhealthy' }
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
              'results': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'name': { 'type': 'string' }, 'status': { 'enum': ['healthy', 'unhealthy'], 'type': 'string' } },
                  'required': ['name', 'status'],
                  'type': 'object'
                },
                'type': 'array'
              },
              'status': { 'const': 'unhealthy' }
            },
            'required': ['results', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'rejecting-check-unhealthy' }
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
            'properties': { 'resultStatus': { 'const': 'unhealthy' }, 'status': { 'const': 'unhealthy' } },
            'required': ['resultStatus', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'timeout-check-unhealthy' }
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
            'properties': { 'rejectionEvents': { 'type': 'number' }, 'resultStatus': { 'const': 'unhealthy' }, 'status': { 'const': 'unhealthy' } },
            'required': ['rejectionEvents', 'resultStatus', 'status'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'timed-out-late-rejection-owned' }
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
            'properties': { 'remainingCount': { 'type': 'number' }, 'status': { 'const': 'healthy' } },
            'required': ['remainingCount', 'status'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'checks': checksArraySchema, 'unregister': { 'type': 'string' } },
            'required': ['checks', 'unregister'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'unregister-removes-check' }
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
              'afterRegisterHas': { 'const': true },
              'afterUnregisterHas': { 'const': false },
              'initialHas': { 'const': false },
              'registeredNames': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['afterRegisterHas', 'afterUnregisterHas', 'initialHas', 'registeredNames'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'has-and-list-reflect-registration' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'status': { 'const': 'healthy' } }, 'required': ['status'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'checks': checksArraySchema }, 'required': ['checks'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 're-register-replaces-check' }
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
          { 'resultCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'status': SchemaNode.defineConst('healthy' as const) },
          ['resultCount', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': EmptyChecksNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('empty-registry-healthy' as const)
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
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineConst('healthy' as const) },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            ),
            'status': SchemaNode.defineConst('healthy' as const)
          },
          ['results', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('all-healthy' as const)
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
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                {
                  'name': SchemaNode.defineString({ 'type': 'string' } as const),
                  'status': SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'degraded'] as const)
                },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            ),
            'status': SchemaNode.defineConst('degraded' as const)
          },
          ['results', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('one-degraded' as const)
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
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'status': HealthStatusNode },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            ),
            'status': SchemaNode.defineConst('unhealthy' as const)
          },
          ['results', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('one-unhealthy' as const)
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
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                {
                  'name': SchemaNode.defineString({ 'type': 'string' } as const),
                  'status': SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'unhealthy'] as const)
                },
                ['name', 'status'] as const,
                { 'additionalProperties': false }
              )
            ),
            'status': SchemaNode.defineConst('unhealthy' as const)
          },
          ['results', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('rejecting-check-unhealthy' as const)
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
          { 'resultStatus': SchemaNode.defineConst('unhealthy' as const), 'status': SchemaNode.defineConst('unhealthy' as const) },
          ['resultStatus', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('timeout-check-unhealthy' as const)
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
            'rejectionEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'resultStatus': SchemaNode.defineConst('unhealthy' as const),
            'status': SchemaNode.defineConst('unhealthy' as const)
          },
          ['rejectionEvents', 'resultStatus', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('timed-out-late-rejection-owned' as const)
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
          { 'remainingCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'status': SchemaNode.defineConst('healthy' as const) },
          ['remainingCount', 'status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'checks': ChecksArrayNode, 'unregister': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['checks', 'unregister'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('unregister-removes-check' as const)
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
            'afterRegisterHas': SchemaNode.defineConst(true as const),
            'afterUnregisterHas': SchemaNode.defineConst(false as const),
            'initialHas': SchemaNode.defineConst(false as const),
            'registeredNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
          },
          ['afterRegisterHas', 'afterUnregisterHas', 'initialHas', 'registeredNames'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('has-and-list-reflect-registration' as const)
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
          { 'status': SchemaNode.defineConst('healthy' as const) },
          ['status'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'checks': ChecksArrayNode }, ['checks'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('re-register-replaces-check' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export type CheckDefinition = NodeStaticType<typeof CheckDefinitionNode>;
  export type Type = NodeStaticType<typeof Node>;
}
