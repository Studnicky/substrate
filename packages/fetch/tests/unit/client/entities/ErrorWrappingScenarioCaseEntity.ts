import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `error-wrapping.loop.spec.ts` scenario case shape. `shape` selects which private wrapping path the case exercises. */
export namespace ErrorWrappingScenarioCaseEntity {
  const shapes = [
    'handle-dispatcher-health', 'handle-invalid-origin', 'handle-no-dispatcher', 'wrap-body-timeout',
    'wrap-connect-timeout', 'wrap-headers-timeout', 'wrap-no-code', 'wrap-socket-error', 'wrap-unknown-code'
  ] as const;

  /** Deliberately narrower than `ClientConfigDataEntity`: only the fields these fixtures set, kept flattening-safe for `NodeSchemaAgreement` (no `anyOf`/`patternProperties`). */
  const fetchClientSchema = {
    'additionalProperties': false,
    'properties': {
      'baseURL': { 'minLength': 1, 'type': 'string' },
      'dispatcher': {
        'additionalProperties': false,
        'properties': { 'connections': { 'minimum': 1, 'type': 'integer' }, 'enabled': { 'type': 'boolean' } },
        'required': [],
        'type': 'object'
      }
    },
    'required': ['baseURL'],
    'type': 'object'
  } as const;

  const FetchClientNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'baseURL': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'dispatcher': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        [] as const,
        { 'additionalProperties': false }
      )
    },
    ['baseURL'] as const,
    { 'additionalProperties': false }
  );

  const expectedSchema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'undefined' } }, 'required': ['shape'], 'type': 'object' },
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'socket-exhaustion' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': {
          'errorName': { 'enum': ['BodyTimeoutError', 'ConnectTimeoutError', 'HeadersTimeoutError', 'SocketError'] },
          'shape': { 'const': 'error' }
        },
        'required': ['errorName', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': expectedSchema,
      'input': {
        'additionalProperties': false,
        'properties': {
          'errorCode': { 'type': 'string' },
          'fetchClient': fetchClientSchema,
          'url': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['fetchClient', 'url'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': shapes }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ExpectedNode = SchemaNode.defineOneOf([
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('undefined' as const) }, ['shape'] as const, { 'additionalProperties': false }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('socket-exhaustion' as const) }, ['shape'] as const, { 'additionalProperties': false }),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'errorName': SchemaNode.defineEnum(['BodyTimeoutError', 'ConnectTimeoutError', 'HeadersTimeoutError', 'SocketError'] as const),
        'shape': SchemaNode.defineConst('error' as const)
      },
      ['errorName', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ExpectedNode,
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'errorCode': SchemaNode.defineString({ 'type': 'string' } as const),
          'fetchClient': FetchClientNode,
          'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['fetchClient', 'url'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(shapes)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
