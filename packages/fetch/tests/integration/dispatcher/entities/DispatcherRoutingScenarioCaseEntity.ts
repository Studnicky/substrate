import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `dispatcher-routing.loop.spec.ts` scenario case shape: one `oneOf` branch per `operation`. */
export namespace DispatcherRoutingScenarioCaseEntity {
  const inputSchema = {
    'additionalProperties': false,
    'properties': {
      'dispatcher': { 'additionalProperties': false, 'properties': { 'connections': { 'minimum': 1, 'type': 'integer' } }, 'required': ['connections'], 'type': 'object' },
      'fetchClient': { 'additionalProperties': false, 'properties': { 'baseURL': { 'minLength': 1, 'type': 'string' } }, 'required': ['baseURL'], 'type': 'object' },
      'path': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['dispatcher', 'fetchClient', 'path'],
    'type': 'object'
  } as const;
  const InputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'dispatcher': SchemaNode.defineObject({ 'type': 'object' } as const, { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, ['connections'] as const, { 'additionalProperties': false }),
      'fetchClient': SchemaNode.defineObject({ 'type': 'object' } as const, { 'baseURL': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['baseURL'] as const, { 'additionalProperties': false }),
      'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['dispatcher', 'fetchClient', 'path'] as const,
    { 'additionalProperties': false }
  );

  const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'input': InputNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'originRecorded': { 'const': true } }, 'required': ['originRecorded'], 'type': 'object' }, 'operation': { 'const': 'routes-through-configured-dispatcher' } },
        'required': ['description', 'expected', 'input', 'name', 'operation'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'idleOriginRecorded': { 'const': false } }, 'required': ['idleOriginRecorded'], 'type': 'object' }, 'operation': { 'const': 'isolates-unrelated-dispatcher' } },
        'required': ['description', 'expected', 'input', 'name', 'operation'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { ...caseNodeFields, 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'originRecorded': SchemaNode.defineConst(true as const) }, ['originRecorded'] as const, { 'additionalProperties': false }), 'operation': SchemaNode.defineConst('routes-through-configured-dispatcher' as const) },
      ['description', 'expected', 'input', 'name', 'operation'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { ...caseNodeFields, 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'idleOriginRecorded': SchemaNode.defineConst(false as const) }, ['idleOriginRecorded'] as const, { 'additionalProperties': false }), 'operation': SchemaNode.defineConst('isolates-unrelated-dispatcher' as const) },
      ['description', 'expected', 'input', 'name', 'operation'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
