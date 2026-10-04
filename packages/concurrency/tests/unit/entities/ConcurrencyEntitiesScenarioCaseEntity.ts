import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

// invalid-contracts
const invalidContractsSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } }, 'required': ['validationResults'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'validations': { 'items': { 'additionalProperties': false, 'properties': { 'entity': { 'enum': ['AsyncIterDoneDiscriminantEntity', 'AsyncIterErrorDiscriminantEntity', 'AsyncIterValueDiscriminantEntity', 'ChannelEntryStateEntity', 'ChannelStateEntity', 'DispatchCompletedEventEntity', 'DispatchStartedEventEntity', 'SemaphoreWaiterFlagsEntity'] }, 'expected': { 'type': 'boolean' }, 'value': {  } }, 'required': ['entity', 'expected', 'value'], 'type': 'object' }, 'type': 'array' } }, 'required': ['validations'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'invalid-contracts' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const invalidContractsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineEnum({}, ['AsyncIterDoneDiscriminantEntity', 'AsyncIterErrorDiscriminantEntity', 'AsyncIterValueDiscriminantEntity', 'ChannelEntryStateEntity', 'ChannelStateEntity', 'DispatchCompletedEventEntity', 'DispatchStartedEventEntity', 'SemaphoreWaiterFlagsEntity'] as const), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'invalid-contracts' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// valid-contracts
const validContractsSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } }, 'required': ['validationResults'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'validations': { 'items': { 'additionalProperties': false, 'properties': { 'entity': { 'enum': ['AsyncIterDoneDiscriminantEntity', 'AsyncIterErrorDiscriminantEntity', 'AsyncIterValueDiscriminantEntity', 'ChannelEntryStateEntity', 'ChannelStateEntity', 'DispatchCompletedEventEntity', 'DispatchStartedEventEntity', 'SemaphoreWaiterFlagsEntity'] }, 'expected': { 'type': 'boolean' }, 'value': {  } }, 'required': ['entity', 'expected', 'value'], 'type': 'object' }, 'type': 'array' } }, 'required': ['validations'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'valid-contracts' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const validContractsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineEnum({}, ['AsyncIterDoneDiscriminantEntity', 'AsyncIterErrorDiscriminantEntity', 'AsyncIterValueDiscriminantEntity', 'ChannelEntryStateEntity', 'ChannelStateEntity', 'DispatchCompletedEventEntity', 'DispatchStartedEventEntity', 'SemaphoreWaiterFlagsEntity'] as const), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'valid-contracts' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Every distinct `shape` value the spec exercises, discriminated by the `shape` const field. */
export namespace ConcurrencyEntitiesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      invalidContractsSchema,
      validContractsSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    invalidContractsNode,
    validContractsNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
