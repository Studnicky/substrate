import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class EntityContractsScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'badStack': { 'type': 'boolean' },
            'missingMessage': { 'type': 'boolean' },
            'missingName': { 'type': 'boolean' },
            'valid': { 'type': 'boolean' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'badStack': {},
            'missingMessage': {},
            'missingName': {},
            'value': {}
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
        'badStack': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'missingMessage': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'missingName': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'badStack': SchemaNode.defineUnknown({} as const),
        'missingMessage': SchemaNode.defineUnknown({} as const),
        'missingName': SchemaNode.defineUnknown({} as const),
        'value': SchemaNode.defineUnknown({} as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `entity-contracts.loop.spec.ts` exercises across every errors-package entity's `validate`. */
export namespace EntityContractsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      EntityContractsScenarioCaseBuilders.branchSchema('aggregate-view-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('aggregate-view-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-classification-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-classification-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-code-descriptor-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-code-descriptor-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-diagnostic-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-diagnostic-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-diagnostic-valid-no-stack'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-address-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-address-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-code-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-code-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-errno-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-errno-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-hostname-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-hostname-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-port-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-port-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-retry-after-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-retry-after-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-status-code-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-status-code-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-status-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-status-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-syscall-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('error-with-syscall-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('problem-details-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('problem-details-invalid-item'),
      EntityContractsScenarioCaseBuilders.branchSchema('problem-details-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('problem-details-valid-empty-errors'),
      EntityContractsScenarioCaseBuilders.branchSchema('report-options-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('report-options-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('validation-arguments-invalid-top-level'),
      EntityContractsScenarioCaseBuilders.branchSchema('validation-arguments-invalid-violation'),
      EntityContractsScenarioCaseBuilders.branchSchema('validation-arguments-valid'),
      EntityContractsScenarioCaseBuilders.branchSchema('violation-detail-invalid'),
      EntityContractsScenarioCaseBuilders.branchSchema('violation-detail-valid')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    EntityContractsScenarioCaseBuilders.branchNode('aggregate-view-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('aggregate-view-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-classification-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-classification-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-code-descriptor-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-code-descriptor-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-diagnostic-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-diagnostic-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-diagnostic-valid-no-stack'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-address-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-address-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-code-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-code-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-errno-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-errno-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-hostname-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-hostname-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-port-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-port-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-retry-after-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-retry-after-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-status-code-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-status-code-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-status-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-status-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-syscall-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('error-with-syscall-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('problem-details-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('problem-details-invalid-item'),
    EntityContractsScenarioCaseBuilders.branchNode('problem-details-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('problem-details-valid-empty-errors'),
    EntityContractsScenarioCaseBuilders.branchNode('report-options-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('report-options-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('validation-arguments-invalid-top-level'),
    EntityContractsScenarioCaseBuilders.branchNode('validation-arguments-invalid-violation'),
    EntityContractsScenarioCaseBuilders.branchNode('validation-arguments-valid'),
    EntityContractsScenarioCaseBuilders.branchNode('violation-detail-invalid'),
    EntityContractsScenarioCaseBuilders.branchNode('violation-detail-valid')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
