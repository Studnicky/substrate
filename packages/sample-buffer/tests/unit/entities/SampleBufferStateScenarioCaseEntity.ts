import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The three scenario case shapes `entity-contracts.loop.spec.ts` exercises: constructing `SampleBufferError` and validating `SampleBufferStateEntity`. */
export namespace SampleBufferStateScenarioCaseEntity {
  const validationEntrySchema = {
    'additionalProperties': false,
    'properties': {
      'expected': { 'type': 'boolean' },
      'value': {
        'additionalProperties': false,
        'properties': { 'isFull': { 'type': 'boolean' }, 'length': { 'type': 'number' } },
        'required': ['isFull', 'length'],
        'type': 'object'
      }
    },
    'required': ['expected', 'value'],
    'type': 'object'
  } as const;

  const validationEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'isFull': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'length': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['isFull', 'length'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const validationInputSchema = {
    'additionalProperties': false,
    'properties': { 'validations': { 'items': validationEntrySchema, 'type': 'array' } },
    'required': ['validations'],
    'type': 'object'
  } as const;

  const validationInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, validationEntryNode, undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const validationExpectedSchema = {
    'additionalProperties': false,
    'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
    'required': ['validationResults'],
    'type': 'object'
  } as const;

  const validationExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const errorArgumentSchema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'causeMessage': { 'type': 'string' },
          'correlationId': { 'type': 'string' },
          'message': { 'type': 'string' },
          'retryable': { 'type': 'boolean' }
        },
        'required': ['causeMessage', 'correlationId', 'message', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'causeMessage': { 'type': 'string' },
          'correlationId': { 'type': 'string' },
          'message': { 'type': 'string' },
          'retryable': { 'type': 'boolean' }
        },
        'required': ['causeMessage', 'correlationId', 'message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'error-args' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const errorArgumentNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    }, ['causeMessage', 'correlationId', 'message', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    }, ['causeMessage', 'correlationId', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'error-args' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  class SampleBufferStateScenarioCaseEntityBuilders {
    static validationBranchSchema<const TShape extends string>(shape: TShape): {
      'additionalProperties': false;
      'properties': {
        'description': { 'minLength': 1; 'type': 'string' };
        'expected': typeof validationExpectedSchema;
        'input': typeof validationInputSchema;
        'name': { 'minLength': 1; 'type': 'string' };
        'shape': { 'const': TShape };
      };
      'required': readonly ['description', 'expected', 'input', 'name', 'shape'];
      'type': 'object';
    } {
      const result: {
        'additionalProperties': false;
        'properties': {
          'description': { 'minLength': 1; 'type': 'string' };
          'expected': typeof validationExpectedSchema;
          'input': typeof validationInputSchema;
          'name': { 'minLength': 1; 'type': 'string' };
          'shape': { 'const': TShape };
        };
        'required': readonly ['description', 'expected', 'input', 'name', 'shape'];
        'type': 'object';
      } = {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': validationExpectedSchema,
          'input': validationInputSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': shape }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      };
      return result;
    }

    static validationBranchNode<const TShape extends string>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': validationExpectedNode,
        'input': validationInputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }
  }

  const invalidLengthSchema = SampleBufferStateScenarioCaseEntityBuilders.validationBranchSchema('invalid-length' as const);
  const invalidLengthNode = SampleBufferStateScenarioCaseEntityBuilders.validationBranchNode('invalid-length' as const);
  const validStateSchema = SampleBufferStateScenarioCaseEntityBuilders.validationBranchSchema('valid-state' as const);
  const validStateNode = SampleBufferStateScenarioCaseEntityBuilders.validationBranchNode('valid-state' as const);

  export const Schema = {
    'oneOf': [errorArgumentSchema, invalidLengthSchema, validStateSchema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [errorArgumentNode, invalidLengthNode, validStateNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
