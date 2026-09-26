import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `FsmMetadataEntities.loop.spec.ts` scenario case shape. `value` stays an open bag — it varies per validated entity and is passed straight to `validate`, which accepts `unknown`. */
export namespace FsmMetadataEntitiesScenarioCaseEntity {
  const validationSchema = {
    'additionalProperties': false,
    'properties': {
      'entity': { 'enum': ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] },
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
        'properties': { 'validations': { 'items': validationSchema, 'type': 'array' } },
        'required': ['validations'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['history-timestamp-validation', 'hook-error-count-validation'] }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const ValidationNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'entity': SchemaNode.defineEnum({}, ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] as const),
      'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'value': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} })
    }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, ValidationNode, undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['history-timestamp-validation', 'hook-error-count-validation'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
