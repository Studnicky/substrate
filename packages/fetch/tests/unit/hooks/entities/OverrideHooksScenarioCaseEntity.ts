import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `override-hooks.loop.spec.ts` scenario case shape. All `expected` fields are optional — `operation` picks which subset a runner reads. */
export namespace OverrideHooksScenarioCaseEntity {
  const operations = ['base-on-request', 'base-on-response', 'hook-pipeline', 'metadata', 'request-header-injection', 'response-reject', 'response-wrap', 'url-rewrite'] as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'count': { 'type': 'integer' },
          'entries': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'header': { 'minLength': 1, 'type': 'string' },
          'messageIncludes': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' },
          'value': { 'minLength': 1, 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'baseURL': { 'minLength': 1, 'type': 'string' } }, 'required': ['baseURL'], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' },
      'operation': { 'enum': operations }
    },
    'required': ['description', 'expected', 'input', 'name', 'operation'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'count': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'entries': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)),
          'header': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)),
          'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
          'value': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'baseURL': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['baseURL'] as const, { 'additionalProperties': false }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'operation': SchemaNode.defineEnum(operations)
    },
    ['description', 'expected', 'input', 'name', 'operation'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
