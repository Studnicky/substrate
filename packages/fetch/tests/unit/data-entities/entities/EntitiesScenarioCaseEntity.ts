import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `entities.loop.spec.ts` scenario case shape: one branch per `operation`. */
export namespace EntitiesScenarioCaseEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } }, 'required': ['validationResults'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'validations': { 'items': { 'additionalProperties': false, 'properties': { 'entity': { 'enum': ['ClientConfigDataEntity', 'FetchRequestOptionsEntity', 'QueryParametersEntity'] }, 'expected': { 'type': 'boolean' }, 'value': BoundedJsonValueEntity.Schema }, 'required': ['entity', 'expected', 'value'], 'type': 'object' }, 'type': 'array' } }, 'required': ['validations'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'operation': { 'const': 'validates' }, 'shape': { 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name', 'operation', 'shape'], 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineEnum({}, ['ClientConfigDataEntity', 'FetchRequestOptionsEntity', 'QueryParametersEntity'] as const), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': BoundedJsonValueEntity.Node }, ['entity', 'expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined) }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'operation': SchemaNode.defineConst({}, 'validates' as const), 'shape': SchemaNode.defineString({ 'type': 'string' } as const) }, ['description', 'expected', 'input', 'name', 'operation', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
