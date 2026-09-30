import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const metadataSchema = {
  'additionalProperties': false,
  'properties': { 'attempt': { 'type': 'number' } },
  'required': ['attempt'],
  'type': 'object'
} as const;

const metadataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'attempt': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['attempt'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class DomainErrorScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'code': { 'type': 'string' },
            'correlationId': { 'type': 'string' },
            'hasCause': { 'type': 'boolean' },
            'hasCorrelationId': { 'type': 'boolean' },
            'hasMetadata': { 'type': 'boolean' },
            'hasRetryable': { 'type': 'boolean' },
            'message': { 'type': 'string' },
            'metadata': metadataSchema,
            'name': { 'type': 'string' },
            'path': { 'type': 'string' },
            'retryable': { 'type': 'boolean' },
            'timeoutMs': { 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'error': {
              'additionalProperties': false,
              'properties': {
                'fields': {
                  'additionalProperties': false,
                  'properties': { 'path': { 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
                  'required': ['path', 'timeoutMs'],
                  'type': 'object'
                },
                'options': {
                  'additionalProperties': false,
                  'properties': {
                    'causeMessage': { 'type': 'string' },
                    'code': { 'type': 'string' },
                    'correlationId': { 'type': 'string' },
                    'message': { 'type': 'string' },
                    'messageTemplate': { 'const': 'file-lock-timeout' },
                    'metadata': metadataSchema,
                    'retryable': { 'type': 'boolean' }
                  },
                  'required': ['code'],
                  'type': 'object'
                }
              },
              'required': ['fields', 'options'],
              'type': 'object'
            }
          },
          'required': ['error'],
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
        'hasCause': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hasCorrelationId': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hasMetadata': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'hasRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'metadata': metadataNode,
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'path': SchemaNode.defineString({ 'type': 'string' } as const),
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'error': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'fields': SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': SchemaNode.defineString({ 'type': 'string' } as const), 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['path', 'timeoutMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'options': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'code': SchemaNode.defineString({ 'type': 'string' } as const),
            'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
            'message': SchemaNode.defineString({ 'type': 'string' } as const),
            'messageTemplate': SchemaNode.defineConst({}, 'file-lock-timeout' as const),
            'metadata': metadataNode,
            'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          }, ['code'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['fields', 'options'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `domain-error-args.loop.spec.ts` exercises. */
export namespace DomainErrorArgumentListScenarioCaseEntity {

  export const Schema = {
    'oneOf': [
      DomainErrorScenarioCaseBuilders.branchSchema('assigns-fields'),
      DomainErrorScenarioCaseBuilders.branchSchema('forwards-code-retryable'),
      DomainErrorScenarioCaseBuilders.branchSchema('includes-optional-fields'),
      DomainErrorScenarioCaseBuilders.branchSchema('message-callback'),
      DomainErrorScenarioCaseBuilders.branchSchema('name-resolves'),
      DomainErrorScenarioCaseBuilders.branchSchema('omits-optional-fields'),
      DomainErrorScenarioCaseBuilders.branchSchema('preserves-instanceof'),
      DomainErrorScenarioCaseBuilders.branchSchema('same-fields-object')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    DomainErrorScenarioCaseBuilders.branchNode('assigns-fields'),
    DomainErrorScenarioCaseBuilders.branchNode('forwards-code-retryable'),
    DomainErrorScenarioCaseBuilders.branchNode('includes-optional-fields'),
    DomainErrorScenarioCaseBuilders.branchNode('message-callback'),
    DomainErrorScenarioCaseBuilders.branchNode('name-resolves'),
    DomainErrorScenarioCaseBuilders.branchNode('omits-optional-fields'),
    DomainErrorScenarioCaseBuilders.branchNode('preserves-instanceof'),
    DomainErrorScenarioCaseBuilders.branchNode('same-fields-object')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
