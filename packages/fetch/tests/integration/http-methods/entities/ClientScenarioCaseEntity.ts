import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

const jsonObjectSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
const JsonObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

const bodySchema = { 'oneOf': [jsonObjectSchema, { 'type': 'string' }] } as const;
const BodyNode = SchemaNode.defineOneOf({}, [JsonObjectNode, SchemaNode.defineString({ 'type': 'string' } as const)] as const);

const methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'] as const;

/** The `client.loop.spec.ts` scenario case shape. */
export namespace ClientScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'json': jsonObjectSchema, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } },
        'required': ['status'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'body': bodySchema, 'method': { 'enum': methods }, 'path': { 'minLength': 1, 'type': 'string' } },
        'required': ['method', 'path'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'expected', 'input', 'name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': JsonObjectNode, 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['status'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'body': BodyNode, 'method': SchemaNode.defineEnum({}, methods), 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['method', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
