import type { JSONSchema7Type } from 'json-schema';

import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'aggregate-dedup',
  'aggregate-empty',
  'construction-empty',
  'construction-invalid',
  'construction-non-empty',
  'create-from-array',
  'detaches-source',
  'fallback-message',
  'for-of',
  'from-empty-array',
  'from-null',
  'from-undefined',
  'maps-ajv',
  'merge',
  'merge-empty',
  'report-default',
  'report-empty',
  'report-invalid-status',
  'report-overrides',
  'report-plural',
  'report-title',
  'spread'
] as const;

/** `input` is arbitrary fixture JSON (tagged sentinels included) decoded at runtime by the spec's own `materialize`, so it is registered as its own remote schema resource, matching `BaseErrorScenarioCaseEntity`'s approach. */
const JSON_VALUE_SCHEMA_ID = 'https://studnicky.github.io/substrate/schemas/errors/tests/ValidationErrorsJsonValue';
const JSON_VALUE_REFERENCE = `${JSON_VALUE_SCHEMA_ID}#/$defs/JsonValue`;

const jsonValueRemoteSchema = {
  '$defs': {
    'JsonValue': {
      'anyOf': [
        { 'type': 'null' },
        { 'type': 'boolean' },
        { 'type': 'number' },
        { 'type': 'string' },
        { 'items': { '$ref': '#/$defs/JsonValue' }, 'type': 'array' },
        { 'additionalProperties': { '$ref': '#/$defs/JsonValue' }, 'type': 'object' }
      ]
    }
  },
  '$id': JSON_VALUE_SCHEMA_ID
} as const;

interface JsonValueNodeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

const jsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => SchemaNode.defineAnyOf({}, [
  SchemaNode.defineNull({ 'type': 'null' } as const),
  SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'type': 'string' } as const),
  SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self), undefined),
  SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self), 'patternProperties': {} })
] as const));

const jsonValueReferenceNode = SchemaNode.defineReference(JSON_VALUE_REFERENCE, jsonValueNode);

const violationSchema = {
  'additionalProperties': false,
  'properties': { 'keyword': { 'type': 'string' }, 'message': { 'type': 'string' }, 'path': { 'type': 'string' } },
  'required': ['keyword', 'message', 'path'],
  'type': 'object'
} as const;

const violationNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'keyword': SchemaNode.defineString({ 'type': 'string' } as const), 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'path': SchemaNode.defineString({ 'type': 'string' } as const) }, ['keyword', 'message', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const reportSchema = {
  'additionalProperties': false,
  'properties': {
    'detail': { 'type': 'string' },
    'errors': { 'items': violationSchema, 'type': 'array' },
    'status': { 'type': 'number' },
    'title': { 'type': 'string' },
    'type': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const reportNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'detail': SchemaNode.defineString({ 'type': 'string' } as const),
    'errors': SchemaNode.defineArray({ 'type': 'array' } as const, violationNode, undefined),
    'status': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'title': SchemaNode.defineString({ 'type': 'string' } as const),
    'type': SchemaNode.defineString({ 'type': 'string' } as const)
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const aggregateSchema = {
  'additionalProperties': false,
  'properties': {
    'count': { 'type': 'number' },
    'keywords': { 'items': { 'type': 'string' }, 'type': 'array' },
    'paths': { 'items': { 'type': 'string' }, 'type': 'array' }
  },
  'required': ['count', 'keywords', 'paths'],
  'type': 'object'
} as const;

const aggregateNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'keywords': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
    'paths': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
  }, ['count', 'keywords', 'paths'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shape `validation-errors.loop.spec.ts` exercises across `ValidationErrors`' own contract. */
export namespace ValidationErrorsScenarioCaseEntity {
  export const RemoteSchemas = new Map<string, object | boolean>([[JSON_VALUE_SCHEMA_ID, jsonValueRemoteSchema]]);

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'aggregate': aggregateSchema,
          'items': { 'items': violationSchema, 'type': 'array' },
          'length': { 'type': 'number' },
          'messageIncludes': { 'items': { 'type': 'string' }, 'type': 'array' },
          'ok': { 'type': 'boolean' },
          'report': reportSchema
        },
        'required': [],
        'type': 'object'
      },
      'input': { '$ref': JSON_VALUE_REFERENCE },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'aggregate': aggregateNode,
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, violationNode, undefined),
          'length': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'ok': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'report': reportNode
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': jsonValueReferenceNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
