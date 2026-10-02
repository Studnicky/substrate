import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/browser';
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

const jsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => {
  const result = SchemaNode.defineAnyOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self), undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self), 'patternProperties': {} })
  ] as const);
  return result;
});

const jsonValueReferenceNode = SchemaNode.defineReference(JSON_VALUE_REFERENCE, jsonValueNode);

const causeDescriptorSchema = {
  'additionalProperties': false,
  'properties': { 'message': { 'type': 'string' }, 'shape': { 'enum': ['base-error', 'native-error'] } },
  'required': ['message', 'shape'],
  'type': 'object'
} as const;

const causeDescriptorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'shape': SchemaNode.defineEnum({}, ['base-error', 'native-error'] as const) }, ['message', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

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

const toMessageInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'message': SchemaNode.defineString({ 'type': 'string' } as const),
  'shape': SchemaNode.defineEnum({}, ['native-error', 'primitive'] as const),
  'value': SchemaNode.defineOneOf({}, [SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)])
}, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class BaseErrorScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
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
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cause': SchemaNode.defineOneOf({}, [causeDescriptorNode, SchemaNode.defineString({ 'type': 'string' } as const)]),
        'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
        'depth': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': jsonValueReferenceNode, 'patternProperties': {} }),
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'toMessage': toMessageInputNode
      }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `base-error.loop.spec.ts` exercises across BaseError's own contract. */
export namespace BaseErrorScenarioCaseEntity {
  export const RemoteSchemas = new Map<string, object | boolean>([[JSON_VALUE_SCHEMA_ID, jsonValueRemoteSchema]]);

  export const Schema = {
    'oneOf': [
      BaseErrorScenarioCaseBuilders.branchSchema('cause-chain'),
      BaseErrorScenarioCaseBuilders.branchSchema('cause-chain-primitive'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-cause'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-code'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-correlation-id'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-correlation-id-absent'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-default-retryable'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-explicit-retryable'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-instanceof'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-message'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-metadata'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-metadata-absent'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-metadata-nested'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-name'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-omitted-optional-args'),
      BaseErrorScenarioCaseBuilders.branchSchema('construction-timestamp'),
      BaseErrorScenarioCaseBuilders.branchSchema('find-cause-of-type-hit'),
      BaseErrorScenarioCaseBuilders.branchSchema('find-cause-of-type-miss'),
      BaseErrorScenarioCaseBuilders.branchSchema('find-cause-of-type-primitive'),
      BaseErrorScenarioCaseBuilders.branchSchema('find-cause-of-type-self'),
      BaseErrorScenarioCaseBuilders.branchSchema('has-cause-of-type-hit'),
      BaseErrorScenarioCaseBuilders.branchSchema('has-cause-of-type-miss'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-code-message'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-correlation-absent'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-correlation-value'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-depth-sentinel'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-native-error-cause'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-primitive-cause'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-recursive-cause'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-required-fields'),
      BaseErrorScenarioCaseBuilders.branchSchema('json-roundtrip'),
      BaseErrorScenarioCaseBuilders.branchSchema('to-message-native-error'),
      BaseErrorScenarioCaseBuilders.branchSchema('to-message-primitive'),
      BaseErrorScenarioCaseBuilders.branchSchema('to-problem-details'),
      BaseErrorScenarioCaseBuilders.branchSchema('to-user-message-default'),
      BaseErrorScenarioCaseBuilders.branchSchema('to-user-message-custom')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    BaseErrorScenarioCaseBuilders.branchNode('cause-chain'),
    BaseErrorScenarioCaseBuilders.branchNode('cause-chain-primitive'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-cause'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-code'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-correlation-id'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-correlation-id-absent'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-default-retryable'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-explicit-retryable'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-instanceof'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-message'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-metadata'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-metadata-absent'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-metadata-nested'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-name'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-omitted-optional-args'),
    BaseErrorScenarioCaseBuilders.branchNode('construction-timestamp'),
    BaseErrorScenarioCaseBuilders.branchNode('find-cause-of-type-hit'),
    BaseErrorScenarioCaseBuilders.branchNode('find-cause-of-type-miss'),
    BaseErrorScenarioCaseBuilders.branchNode('find-cause-of-type-primitive'),
    BaseErrorScenarioCaseBuilders.branchNode('find-cause-of-type-self'),
    BaseErrorScenarioCaseBuilders.branchNode('has-cause-of-type-hit'),
    BaseErrorScenarioCaseBuilders.branchNode('has-cause-of-type-miss'),
    BaseErrorScenarioCaseBuilders.branchNode('json-code-message'),
    BaseErrorScenarioCaseBuilders.branchNode('json-correlation-absent'),
    BaseErrorScenarioCaseBuilders.branchNode('json-correlation-value'),
    BaseErrorScenarioCaseBuilders.branchNode('json-depth-sentinel'),
    BaseErrorScenarioCaseBuilders.branchNode('json-native-error-cause'),
    BaseErrorScenarioCaseBuilders.branchNode('json-primitive-cause'),
    BaseErrorScenarioCaseBuilders.branchNode('json-recursive-cause'),
    BaseErrorScenarioCaseBuilders.branchNode('json-required-fields'),
    BaseErrorScenarioCaseBuilders.branchNode('json-roundtrip'),
    BaseErrorScenarioCaseBuilders.branchNode('to-message-native-error'),
    BaseErrorScenarioCaseBuilders.branchNode('to-message-primitive'),
    BaseErrorScenarioCaseBuilders.branchNode('to-problem-details'),
    BaseErrorScenarioCaseBuilders.branchNode('to-user-message-default'),
    BaseErrorScenarioCaseBuilders.branchNode('to-user-message-custom')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, RemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, RemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, RemoteSchemas);
}
