import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ValidationErrorArgumentsEntity } from '../../../src/entities/ValidationErrorArgumentsEntity.js';

const stringSchema = { 'type': 'string' } as const;
const stringNode = SchemaNode.defineString(stringSchema);

const openObjectSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const openObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

const undefinedTagSchema = { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'undefined' } }, 'required': ['shape'], 'type': 'object' } as const;
const undefinedTagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'undefined' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expectedViolationSchema = {
  'additionalProperties': false,
  'properties': { 'details': openObjectSchema, 'message': stringSchema, 'path': stringSchema },
  'required': ['message', 'path'],
  'type': 'object'
} as const;
const expectedViolationNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'details': openObjectNode, 'message': stringNode, 'path': stringNode }, ['message', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const stringListSchema = { 'items': stringSchema, 'type': 'array' } as const;
const stringListNode = SchemaNode.defineArray({ 'type': 'array' } as const, stringNode, undefined);

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class ValidationErrorScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'code': stringSchema,
            'correlationId': stringSchema,
            'count': { 'type': 'number' },
            'hasViolations': { 'type': 'boolean' },
            'instance': stringSchema,
            'instanceof': stringListSchema,
            'message': stringSchema,
            'messageIncludes': stringListSchema,
            'messageType': stringSchema,
            'retryable': { 'type': 'boolean' },
            'tags': stringListSchema,
            'violations': { 'oneOf': [undefinedTagSchema, { 'items': expectedViolationSchema, 'type': 'array' }] },
            'violationsLength': { 'type': 'number' },
            'violationsLimit': { 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': ValidationErrorArgumentsEntity.Schema,
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'code': stringNode,
        'correlationId': stringNode,
        'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'hasViolations': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'instance': stringNode,
        'instanceof': stringListNode,
        'message': stringNode,
        'messageIncludes': stringListNode,
        'messageType': stringNode,
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'tags': stringListNode,
        'violations': SchemaNode.defineOneOf({}, [undefinedTagNode, SchemaNode.defineArray({ 'type': 'array' } as const, expectedViolationNode, undefined)] as const),
        'violationsLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'violationsLimit': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': ValidationErrorArgumentsEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `validation-error.loop.spec.ts` exercises across `ValidationError`'s own contract. */
export namespace ValidationErrorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ValidationErrorScenarioCaseBuilders.branchSchema('code'),
      ValidationErrorScenarioCaseBuilders.branchSchema('correlation-id'),
      ValidationErrorScenarioCaseBuilders.branchSchema('detach-violations'),
      ValidationErrorScenarioCaseBuilders.branchSchema('instanceof'),
      ValidationErrorScenarioCaseBuilders.branchSchema('json-excludes-violations'),
      ValidationErrorScenarioCaseBuilders.branchSchema('json-includes-violations'),
      ValidationErrorScenarioCaseBuilders.branchSchema('json-roundtrip'),
      ValidationErrorScenarioCaseBuilders.branchSchema('json-serializes'),
      ValidationErrorScenarioCaseBuilders.branchSchema('message-with-path'),
      ValidationErrorScenarioCaseBuilders.branchSchema('retryable'),
      ValidationErrorScenarioCaseBuilders.branchSchema('user-message-empty-violations'),
      ValidationErrorScenarioCaseBuilders.branchSchema('user-message-plain'),
      ValidationErrorScenarioCaseBuilders.branchSchema('user-message-violations'),
      ValidationErrorScenarioCaseBuilders.branchSchema('violations-absent'),
      ValidationErrorScenarioCaseBuilders.branchSchema('violations-complex-details'),
      ValidationErrorScenarioCaseBuilders.branchSchema('violations-present'),
      ValidationErrorScenarioCaseBuilders.branchSchema('violations-present-details')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ValidationErrorScenarioCaseBuilders.branchNode('code'),
    ValidationErrorScenarioCaseBuilders.branchNode('correlation-id'),
    ValidationErrorScenarioCaseBuilders.branchNode('detach-violations'),
    ValidationErrorScenarioCaseBuilders.branchNode('instanceof'),
    ValidationErrorScenarioCaseBuilders.branchNode('json-excludes-violations'),
    ValidationErrorScenarioCaseBuilders.branchNode('json-includes-violations'),
    ValidationErrorScenarioCaseBuilders.branchNode('json-roundtrip'),
    ValidationErrorScenarioCaseBuilders.branchNode('json-serializes'),
    ValidationErrorScenarioCaseBuilders.branchNode('message-with-path'),
    ValidationErrorScenarioCaseBuilders.branchNode('retryable'),
    ValidationErrorScenarioCaseBuilders.branchNode('user-message-empty-violations'),
    ValidationErrorScenarioCaseBuilders.branchNode('user-message-plain'),
    ValidationErrorScenarioCaseBuilders.branchNode('user-message-violations'),
    ValidationErrorScenarioCaseBuilders.branchNode('violations-absent'),
    ValidationErrorScenarioCaseBuilders.branchNode('violations-complex-details'),
    ValidationErrorScenarioCaseBuilders.branchNode('violations-present'),
    ValidationErrorScenarioCaseBuilders.branchNode('violations-present-details')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
