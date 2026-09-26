import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `entities.loop.spec.ts` scenario case shape. Each `validations[].value` bag is entity-specific, so it stays an open object. */
export namespace EntitiesScenarioCaseEntity {
  const validationCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'entity': {
        'enum': [
          'WorkerErrorEnvelopeEntity', 'WorkerLogEnvelopeEntity', 'WorkerPoolConfigEntity',
          'WorkerProgressEnvelopeEntity', 'WorkerTaskDispositionEntity', 'WorkerTaskIndexEntity'
        ]
      },
      'expected': { 'type': 'boolean' },
      'value': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' }
    },
    'required': ['entity', 'expected', 'value'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
        'required': ['validationResults'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'validations': { 'items': validationCaseSchema, 'type': 'array' } },
        'required': ['validations'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['rejects-invalid', 'validates-everything'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ValidationCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'entity': SchemaNode.defineEnum({}, [
        'WorkerErrorEnvelopeEntity', 'WorkerLogEnvelopeEntity', 'WorkerPoolConfigEntity',
        'WorkerProgressEnvelopeEntity', 'WorkerTaskDispositionEntity', 'WorkerTaskIndexEntity'
      ] as const),
      'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'value': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} })
    }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, ValidationCaseNode, undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['rejects-invalid', 'validates-everything'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
