import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `errors.loop.spec.ts` scenario case shape: two branches, distinguished by whether `expected` carries `error` or `ok`/`status`. */
export namespace ErrorsScenarioCaseEntity {
  const inputSchema = {
    'additionalProperties': false,
    'properties': { 'signal': { 'const': 'abort-after-ms' }, 'timeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'url': { 'minLength': 1, 'type': 'string' } },
    'required': ['url'],
    'type': 'object'
  } as const;
  const InputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'signal': SchemaNode.defineConst('abort-after-ms' as const),
      'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const),
      'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['url'] as const,
    { 'additionalProperties': false }
  );

  const errorExpectedSchema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'enum': ['AbortError', 'Error', 'TimeoutError'] },
      'messageIncludes': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
      'timeoutMs': { 'exclusiveMinimum': 0, 'type': 'integer' },
      'urlIncludes': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['error'],
    'type': 'object'
  } as const;
  const statusExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'ok': { 'type': 'boolean' }, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } },
    'required': ['ok', 'status'],
    'type': 'object'
  } as const;

  export const Schema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': errorExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name'], 'type': 'object' },
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': statusExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name'], 'type': 'object' }
    ]
  } as const;

  const ErrorExpectedNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'error': SchemaNode.defineEnum(['AbortError', 'Error', 'TimeoutError'] as const),
      'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)),
      'timeoutMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const),
      'urlIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['error'] as const,
    { 'additionalProperties': false }
  );
  const StatusExpectedNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'ok': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) },
    ['ok', 'status'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': ErrorExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
      ['description', 'expected', 'input', 'name'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': StatusExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
      ['description', 'expected', 'input', 'name'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
