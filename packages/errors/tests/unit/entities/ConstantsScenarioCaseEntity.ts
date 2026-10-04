import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const ERROR_DEFAULT_SCENARIOS = [
  'AUTHENTICATION',
  'AUTHORIZATION',
  'CONFIGURATION',
  'CONNECTION',
  'DATABASE',
  'EXTERNAL_SERVICE',
  'INTERNAL',
  'NOT_FOUND',
  'RATE_LIMIT',
  'TIMEOUT',
  'VALIDATION'
] as const;

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class ConstantsScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }, { 'type': 'boolean' }, { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' }] },
          'properties': {},
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }] },
          'properties': {
            'error': {
              'additionalProperties': false,
              'properties': {
                'causeMessage': { 'type': 'string' },
                'message': { 'type': 'string' },
                'options': {
                  'additionalProperties': false,
                  'properties': {
                    'context': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
                    'retryable': { 'type': 'boolean' },
                    'scenario': { 'enum': ERROR_DEFAULT_SCENARIOS },
                    'status': { 'type': 'number' }
                  },
                  'required': ['scenario'],
                  'type': 'object'
                }
              },
              'required': ['message', 'options'],
              'type': 'object'
            },
            'scenario': { 'enum': ERROR_DEFAULT_SCENARIOS }
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineOneOf({}, [SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} })]), 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'error': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'options': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'context': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
            'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'scenario': SchemaNode.defineEnum({}, ERROR_DEFAULT_SCENARIOS),
            'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['scenario'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['message', 'options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'scenario': SchemaNode.defineEnum({}, ERROR_DEFAULT_SCENARIOS)
      }, [] as const, { 'additionalProperties': SchemaNode.defineOneOf({}, [SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)]), 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The scenario case shape `constants.loop.spec.ts` exercises across error-code/HTTP-status
 * constant snapshots and ModuleError construction. `error-code-values`/`http-status-client`/
 * `http-status-server` compare `input` to `expected` directly as full enum-name snapshots, so
 * both share one open dictionary shape; the ModuleError-construction shapes (`defaults`,
 * `retryable`, `module-error-authentication`, `integration-*`) share a nested `error` input.
 */
export namespace ConstantsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ConstantsScenarioCaseBuilders.branchSchema('defaults'),
      ConstantsScenarioCaseBuilders.branchSchema('error-code-values'),
      ConstantsScenarioCaseBuilders.branchSchema('http-status-client'),
      ConstantsScenarioCaseBuilders.branchSchema('http-status-server'),
      ConstantsScenarioCaseBuilders.branchSchema('integration-cause-override'),
      ConstantsScenarioCaseBuilders.branchSchema('integration-context-override'),
      ConstantsScenarioCaseBuilders.branchSchema('integration-retryable-override'),
      ConstantsScenarioCaseBuilders.branchSchema('integration-status-code-override'),
      ConstantsScenarioCaseBuilders.branchSchema('module-error-authentication'),
      ConstantsScenarioCaseBuilders.branchSchema('retryable')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ConstantsScenarioCaseBuilders.branchNode('defaults'),
    ConstantsScenarioCaseBuilders.branchNode('error-code-values'),
    ConstantsScenarioCaseBuilders.branchNode('http-status-client'),
    ConstantsScenarioCaseBuilders.branchNode('http-status-server'),
    ConstantsScenarioCaseBuilders.branchNode('integration-cause-override'),
    ConstantsScenarioCaseBuilders.branchNode('integration-context-override'),
    ConstantsScenarioCaseBuilders.branchNode('integration-retryable-override'),
    ConstantsScenarioCaseBuilders.branchNode('integration-status-code-override'),
    ConstantsScenarioCaseBuilders.branchNode('module-error-authentication'),
    ConstantsScenarioCaseBuilders.branchNode('retryable')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
