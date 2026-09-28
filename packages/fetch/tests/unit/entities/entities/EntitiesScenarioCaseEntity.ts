import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `entities.loop.spec.ts` scenario case shape: `value` is deliberately loose — it exercises both valid and invalid input for whichever entity `entity` names. */
export namespace EntitiesScenarioCaseEntity {
  const entityNames = ['ClientConfigDataEntity', 'FetchRequestOptionsEntity', 'QueryParametersEntity'] as const;
  const shapes = ['client-config-invalid', 'client-config-valid', 'query-parameters-invalid', 'query-parameters-valid', 'request-options-invalid', 'request-options-valid'] as const;

  const validationCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'entity': { 'enum': entityNames },
      'expected': { 'type': 'boolean' },
      'value': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' }
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
      'shape': { 'enum': shapes }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ValidationCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'entity': SchemaNode.defineEnum({}, entityNames),
      'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'value': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} })
    }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, ValidationCaseNode, undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, shapes)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
