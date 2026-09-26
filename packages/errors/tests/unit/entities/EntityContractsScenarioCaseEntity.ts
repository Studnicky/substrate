import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The scenario case shape `entity-contracts.loop.spec.ts` exercises across every errors-package entity's `validate`. */
export namespace EntityContractsScenarioCaseEntity {
  export const Schema = {
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
      'shape': { 'enum': ['aggregate-view-invalid', 'aggregate-view-valid', 'error-classification-invalid', 'error-classification-valid', 'error-code-descriptor-invalid', 'error-code-descriptor-valid', 'error-diagnostic-invalid', 'error-diagnostic-valid', 'error-diagnostic-valid-no-stack', 'error-with-address-invalid', 'error-with-address-valid', 'error-with-code-invalid', 'error-with-code-valid', 'error-with-errno-invalid', 'error-with-errno-valid', 'error-with-hostname-invalid', 'error-with-hostname-valid', 'error-with-port-invalid', 'error-with-port-valid', 'error-with-retry-after-invalid', 'error-with-retry-after-valid', 'error-with-status-code-invalid', 'error-with-status-code-valid', 'error-with-status-invalid', 'error-with-status-valid', 'error-with-syscall-invalid', 'error-with-syscall-valid', 'problem-details-invalid', 'problem-details-invalid-item', 'problem-details-valid', 'problem-details-valid-empty-errors', 'report-options-invalid', 'report-options-valid', 'validation-arguments-invalid-top-level', 'validation-arguments-invalid-violation', 'validation-arguments-valid', 'violation-detail-invalid', 'violation-detail-valid'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
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
      'shape': SchemaNode.defineEnum({}, ['aggregate-view-invalid', 'aggregate-view-valid', 'error-classification-invalid', 'error-classification-valid', 'error-code-descriptor-invalid', 'error-code-descriptor-valid', 'error-diagnostic-invalid', 'error-diagnostic-valid', 'error-diagnostic-valid-no-stack', 'error-with-address-invalid', 'error-with-address-valid', 'error-with-code-invalid', 'error-with-code-valid', 'error-with-errno-invalid', 'error-with-errno-valid', 'error-with-hostname-invalid', 'error-with-hostname-valid', 'error-with-port-invalid', 'error-with-port-valid', 'error-with-retry-after-invalid', 'error-with-retry-after-valid', 'error-with-status-code-invalid', 'error-with-status-code-valid', 'error-with-status-invalid', 'error-with-status-valid', 'error-with-syscall-invalid', 'error-with-syscall-valid', 'problem-details-invalid', 'problem-details-invalid-item', 'problem-details-valid', 'problem-details-valid-empty-errors', 'report-options-invalid', 'report-options-valid', 'validation-arguments-invalid-top-level', 'validation-arguments-invalid-violation', 'validation-arguments-valid', 'violation-detail-invalid', 'violation-detail-valid'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
