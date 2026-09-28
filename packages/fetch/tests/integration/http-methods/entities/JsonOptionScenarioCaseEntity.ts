import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

const jsonObjectSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
const JsonObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

const inputSchema = {
  'additionalProperties': false,
  'properties': {
    'baseURL': { 'minLength': 1, 'type': 'string' },
    'body': jsonObjectSchema,
    'json': jsonObjectSchema,
    'method': { 'enum': ['PATCH', 'POST', 'PUT'] },
    'path': { 'minLength': 1, 'type': 'string' }
  },
  'required': ['baseURL', 'method', 'path'],
  'type': 'object'
} as const;
const InputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'baseURL': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'body': JsonObjectNode,
    'json': JsonObjectNode,
    'method': SchemaNode.defineEnum({}, ['PATCH', 'POST', 'PUT'] as const),
    'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['baseURL', 'method', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const commonFields = { 'client': { 'enum': ['absolute', 'base'] }, 'description': { 'minLength': 1, 'type': 'string' }, 'input': inputSchema, 'name': { 'minLength': 1, 'type': 'string' } } as const;
const commonNodeFields = {
  'client': SchemaNode.defineEnum({}, ['absolute', 'base'] as const),
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'input': InputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
};

/** The `json-option.loop.spec.ts` scenario case shape: two branches, distinguished by whether `expected` carries `body` or `json`. */
export namespace JsonOptionScenarioCaseEntity {
  const bodyExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'body': jsonObjectSchema, 'headerContentType': { 'minLength': 1, 'type': 'string' }, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } },
    'required': ['body', 'status'],
    'type': 'object'
  } as const;
  const jsonExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'json': jsonObjectSchema, 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } },
    'required': ['json', 'status'],
    'type': 'object'
  } as const;

  export const Schema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { ...commonFields, 'expected': bodyExpectedSchema }, 'required': ['client', 'description', 'expected', 'input', 'name'], 'type': 'object' },
      { 'additionalProperties': false, 'properties': { ...commonFields, 'expected': jsonExpectedSchema }, 'required': ['client', 'description', 'expected', 'input', 'name'], 'type': 'object' }
    ]
  } as const;

  const BodyExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'body': JsonObjectNode,
      'headerContentType': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const)
    }, ['body', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const JsonExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'json': JsonObjectNode, 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['json', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, { ...commonNodeFields, 'expected': BodyExpectedNode }, ['client', 'description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, { ...commonNodeFields, 'expected': JsonExpectedNode }, ['client', 'description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
