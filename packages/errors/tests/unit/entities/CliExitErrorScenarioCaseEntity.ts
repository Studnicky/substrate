import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const omittedTagSchema = {
  'additionalProperties': false,
  'properties': { '__shape': { 'const': 'undefined' } },
  'required': ['__shape'],
  'type': 'object'
} as const;

const omittedTagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { '__shape': SchemaNode.defineConst({}, 'undefined' as const) }, ['__shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const exitCodeInputSchema = {
  'additionalProperties': false,
  'properties': { 'exitCode': { 'oneOf': [{ 'type': 'number' }, omittedTagSchema] } },
  'required': ['exitCode'],
  'type': 'object'
} as const;

const exitCodeInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'exitCode': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), omittedTagNode]) }, ['exitCode'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class CliExitErrorScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'code': { 'type': 'string' },
            'exitCode': { 'type': 'number' },
            'instanceOf': { 'items': { 'type': 'string' }, 'type': 'array' },
            'message': { 'type': 'string' },
            'name': { 'type': 'string' },
            'retryable': { 'type': 'boolean' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'code': { 'type': 'string' },
            'error': exitCodeInputSchema,
            'instanceOf': { 'items': { 'type': 'string' }, 'type': 'array' },
            'message': { 'type': 'string' },
            'name': { 'type': 'string' },
            'retryable': { 'type': 'boolean' }
          },
          'required': [],
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
        'exitCode': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'instanceOf': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'error': exitCodeInputNode,
        'instanceOf': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `cli-exit-error.loop.spec.ts` exercises across CliExitError's own contract. */
export namespace CliExitErrorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      CliExitErrorScenarioCaseBuilders.branchSchema('code-value'),
      CliExitErrorScenarioCaseBuilders.branchSchema('empty-message'),
      CliExitErrorScenarioCaseBuilders.branchSchema('exit-code'),
      CliExitErrorScenarioCaseBuilders.branchSchema('instance-check'),
      CliExitErrorScenarioCaseBuilders.branchSchema('json-code'),
      CliExitErrorScenarioCaseBuilders.branchSchema('name-value'),
      CliExitErrorScenarioCaseBuilders.branchSchema('not-retryable')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    CliExitErrorScenarioCaseBuilders.branchNode('code-value'),
    CliExitErrorScenarioCaseBuilders.branchNode('empty-message'),
    CliExitErrorScenarioCaseBuilders.branchNode('exit-code'),
    CliExitErrorScenarioCaseBuilders.branchNode('instance-check'),
    CliExitErrorScenarioCaseBuilders.branchNode('json-code'),
    CliExitErrorScenarioCaseBuilders.branchNode('name-value'),
    CliExitErrorScenarioCaseBuilders.branchNode('not-retryable')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
