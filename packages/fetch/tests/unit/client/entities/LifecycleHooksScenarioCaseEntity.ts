import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `lifecycle-hooks.loop.spec.ts` scenario case shape. All `input`/`expected` fields but `path` are optional — `operation` picks which subset a runner reads. */
export namespace LifecycleHooksScenarioCaseEntity {
  const operations = [
    'abort-event', 'abort-event-preaborted', 'dispatcher-destroy', 'dispatcher-destroy-no-dispatcher', 'dispatcher-destroy-with-timeout',
    'fast-hook', 'hook-timeout', 'never-settles', 'request-start', 'response-error', 'response-success', 'throw-dispatcher-destroy',
    'throw-fetch-error', 'throw-fetch-string', 'throw-request-error', 'throw-request-error-string', 'throw-request-start',
    'throw-response-success', 'throw-timeout', 'timeout-event', 'undici-error-wrap'
  ] as const;

  /** Deliberately narrower than `DispatcherConfigEntity`: only the fields these fixtures set, kept flattening-safe for `NodeSchemaAgreement`. */
  const dispatcherSchema = {
    'additionalProperties': false,
    'properties': { 'connections': { 'minimum': 1, 'type': 'integer' }, 'enabled': { 'type': 'boolean' } },
    'required': [],
    'type': 'object'
  } as const;
  const DispatcherNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'count': { 'type': 'integer' },
          'events': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'hook': { 'minLength': 1, 'type': 'string' },
          'hookName': { 'minLength': 1, 'type': 'string' },
          'message': { 'type': 'string' },
          'status': { 'type': 'integer' },
          'timeoutMs': { 'type': 'integer' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'abortAfterMs': { 'type': 'integer' },
          'dispatcher': dispatcherSchema,
          'hookTimeoutMs': { 'type': 'integer' },
          'message': { 'type': 'string' },
          'method': { 'minLength': 1, 'type': 'string' },
          'path': { 'minLength': 1, 'type': 'string' },
          'settleMs': { 'type': 'integer' },
          'timeoutMs': { 'type': 'integer' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'operation': { 'enum': operations }
    },
    'required': ['description', 'expected', 'input', 'name', 'operation'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'events': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
          'hook': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'status': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'timeoutMs': SchemaNode.defineNumber({ 'type': 'integer' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'abortAfterMs': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'dispatcher': DispatcherNode,
          'hookTimeoutMs': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'method': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'settleMs': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'timeoutMs': SchemaNode.defineNumber({ 'type': 'integer' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'operation': SchemaNode.defineEnum({}, operations)
    }, ['description', 'expected', 'input', 'name', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
