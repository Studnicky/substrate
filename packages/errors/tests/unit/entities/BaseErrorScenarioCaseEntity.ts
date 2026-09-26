import type { JSONSchema7Type } from 'json-schema';

import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/**
 * `metadata` is free-form JSON, registered as its own remote schema resource (rather than a
 * nested `$id`) because `ScenarioFileCompiler` nests every case schema under a single-schema
 * `items`, which the resource walker does not descend into — the same pattern `packages/drilldown`
 * uses for its recursive `rules` field.
 */
const JSON_VALUE_SCHEMA_ID = 'https://studnicky.github.io/substrate/schemas/errors/tests/JsonValue';
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

const jsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => SchemaNode.defineAnyOf([
  SchemaNode.defineNull({ 'type': 'null' } as const),
  SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'type': 'string' } as const),
  SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self)),
  SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self) })
] as const));

const jsonValueReferenceNode = SchemaNode.defineReference(JSON_VALUE_REFERENCE, jsonValueNode);

const SCENARIO_SHAPES = [
  'cause-chain',
  'cause-chain-primitive',
  'construction-cause',
  'construction-code',
  'construction-correlation-id',
  'construction-correlation-id-absent',
  'construction-default-retryable',
  'construction-explicit-retryable',
  'construction-instanceof',
  'construction-message',
  'construction-metadata',
  'construction-metadata-absent',
  'construction-metadata-nested',
  'construction-name',
  'construction-omitted-optional-args',
  'construction-timestamp',
  'find-cause-of-type-hit',
  'find-cause-of-type-miss',
  'find-cause-of-type-primitive',
  'find-cause-of-type-self',
  'has-cause-of-type-hit',
  'has-cause-of-type-miss',
  'json-code-message',
  'json-correlation-absent',
  'json-correlation-value',
  'json-depth-sentinel',
  'json-native-error-cause',
  'json-primitive-cause',
  'json-recursive-cause',
  'json-required-fields',
  'json-roundtrip',
  'to-message-native-error',
  'to-message-primitive',
  'to-problem-details',
  'to-user-message-default',
  'to-user-message-custom'
] as const;

const causeDescriptorSchema = {
  'additionalProperties': false,
  'properties': { 'message': { 'type': 'string' }, 'shape': { 'enum': ['base-error', 'native-error'] } },
  'required': ['message', 'shape'],
  'type': 'object'
} as const;

const causeDescriptorNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'shape': SchemaNode.defineEnum(['base-error', 'native-error'] as const) },
  ['message', 'shape'] as const,
  { 'additionalProperties': false }
);

const toMessageInputSchema = {
  'additionalProperties': false,
  'properties': {
    'message': { 'type': 'string' },
    'shape': { 'enum': ['native-error', 'primitive'] },
    'value': { 'oneOf': [{ 'type': 'boolean' }, { 'type': 'null' }, { 'type': 'number' }, { 'type': 'string' }] }
  },
  'required': ['shape'],
  'type': 'object'
} as const;

const toMessageInputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'message': SchemaNode.defineString({ 'type': 'string' } as const),
    'shape': SchemaNode.defineEnum(['native-error', 'primitive'] as const),
    'value': SchemaNode.defineOneOf([SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)])
  },
  ['shape'] as const,
  { 'additionalProperties': false }
);

/** The scenario case shape `base-error.loop.spec.ts` exercises across BaseError's own contract. */
export namespace BaseErrorScenarioCaseEntity {
  export const RemoteSchemas = new Map<string, object | boolean>([[JSON_VALUE_SCHEMA_ID, jsonValueRemoteSchema]]);

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'cause': { 'oneOf': [causeDescriptorSchema, { 'type': 'string' }] },
          'correlationId': { 'type': 'string' },
          'depth': { 'type': 'number' },
          'message': { 'type': 'string' },
          'metadata': { 'additionalProperties': { '$ref': JSON_VALUE_REFERENCE }, 'properties': {}, 'required': [], 'type': 'object' },
          'retryable': { 'type': 'boolean' },
          'toMessage': toMessageInputSchema
        },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true }),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'cause': SchemaNode.defineOneOf([causeDescriptorNode, SchemaNode.defineString({ 'type': 'string' } as const)]),
          'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
          'depth': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'metadata': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {},
            [] as const,
            { 'additionalProperties': jsonValueReferenceNode }
          ),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'toMessage': toMessageInputNode
        },
        ['message'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SCENARIO_SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
