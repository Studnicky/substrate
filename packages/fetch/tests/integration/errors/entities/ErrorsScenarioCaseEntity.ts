import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `errors.loop.spec.ts` scenario case shape: two branches, discriminated by `shape`: `rejects` expects an error, `resolves` expects a response status. */
export namespace ErrorsScenarioCaseEntity {
  const inputSchema = {
    'additionalProperties': false,
    'properties': { 'signal': { 'const': 'abort-after-ms' }, 'timeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'url': { 'minLength': 1, 'type': 'string' } },
    'required': ['url'],
    'type': 'object'
  } as const;
  const InputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'signal': SchemaNode.defineConst({}, 'abort-after-ms' as const),
    'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const),
    'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['url'] as const, { 'additionalProperties': false, 'patternProperties': {} });

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
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': errorExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'rejects' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' },
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': statusExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'resolves' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' }
    ]
  } as const;

  const ErrorExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'error': SchemaNode.defineEnum({}, ['AbortError', 'Error', 'TimeoutError'] as const),
    'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
    'timeoutMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const),
    'urlIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const StatusExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'ok': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['ok', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': ErrorExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'rejects' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': StatusExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'resolves' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
