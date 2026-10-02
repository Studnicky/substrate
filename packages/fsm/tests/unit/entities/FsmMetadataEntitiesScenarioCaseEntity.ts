import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

// history-timestamp-validation
const historyTimestampValidationSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } }, 'required': ['validationResults'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'validations': { 'items': { 'additionalProperties': false, 'properties': { 'entity': { 'enum': ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] }, 'expected': { 'type': 'boolean' }, 'value': { 'additionalProperties': true, 'properties': {  }, 'required': [], 'type': 'object' } }, 'required': ['entity', 'expected', 'value'], 'type': 'object' }, 'type': 'array' } }, 'required': ['validations'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'history-timestamp-validation' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const historyTimestampValidationNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineEnum({}, ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] as const), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': true, 'patternProperties': {} }) }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'history-timestamp-validation' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// hook-error-count-validation
const hookErrorCountValidationSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } }, 'required': ['validationResults'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'validations': { 'items': { 'additionalProperties': false, 'properties': { 'entity': { 'enum': ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] }, 'expected': { 'type': 'boolean' }, 'value': { 'additionalProperties': true, 'properties': {  }, 'required': [], 'type': 'object' } }, 'required': ['entity', 'expected', 'value'], 'type': 'object' }, 'type': 'array' } }, 'required': ['validations'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'hook-error-count-validation' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const hookErrorCountValidationNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineEnum({}, ['InterpreterHistoryRecordMetadataEntity', 'RegisteredInterpreterMetricsEntity'] as const), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': true, 'patternProperties': {} }) }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'hook-error-count-validation' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Every distinct `shape` value the spec exercises, discriminated by the `shape` const field. */
export namespace FsmMetadataEntitiesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      historyTimestampValidationSchema,
      hookErrorCountValidationSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    historyTimestampValidationNode,
    hookErrorCountValidationNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
