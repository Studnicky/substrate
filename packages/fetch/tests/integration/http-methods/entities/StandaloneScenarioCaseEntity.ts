import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

const jsonObjectSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
const JsonObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

const bodySchema = { 'oneOf': [jsonObjectSchema, { 'type': 'string' }] } as const;
const BodyNode = SchemaNode.defineOneOf({}, [JsonObjectNode, SchemaNode.defineString({ 'type': 'string' } as const)] as const);

const methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'] as const;
const inputSchema = {
  'additionalProperties': false,
  'properties': { 'body': bodySchema, 'method': { 'enum': methods }, 'path': { 'minLength': 1, 'type': 'string' } },
  'required': ['method', 'path'],
  'type': 'object'
} as const;
const InputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'body': BodyNode, 'method': SchemaNode.defineEnum({}, methods), 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['method', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The `standalone.loop.spec.ts` scenario case shape: two branches, distinguished by `expected.shape`. */
export namespace StandaloneScenarioCaseEntity {
  const okExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'ok' }, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' }, 'text': { 'type': 'string' } },
    'required': ['shape', 'status'],
    'type': 'object'
  } as const;
  const jsonExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'id': { 'type': 'integer' }, 'shape': { 'const': 'json' }, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' }, 'title': { 'type': 'string' } },
    'required': ['shape', 'status'],
    'type': 'object'
  } as const;

  export const Schema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': okExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name'], 'type': 'object' },
      { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': jsonExpectedSchema, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name'], 'type': 'object' }
    ]
  } as const;

  const OkExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'ok' as const), 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const), 'text': SchemaNode.defineString({ 'type': 'string' } as const) }, ['shape', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const JsonExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'id': SchemaNode.defineNumber({ 'type': 'integer' } as const),
      'shape': SchemaNode.defineConst({}, 'json' as const),
      'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const),
      'title': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['shape', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': OkExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': JsonExpectedNode, 'input': InputNode, 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
