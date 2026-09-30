import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const sequenceSchema = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
const sequenceNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined);

const beginSchema = { 'additionalProperties': false, 'properties': { 'type': { 'const': 'begin' } }, 'required': ['type'], 'type': 'object' } as const;
const beginNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineConst({}, 'begin' as const) }, ['type'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const completeSchema = { 'additionalProperties': false, 'properties': { 'sequence': sequenceSchema, 'type': { 'const': 'complete' } }, 'required': ['sequence', 'type'], 'type': 'object' } as const;
const completeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'sequence': sequenceNode, 'type': SchemaNode.defineConst({}, 'complete' as const) }, ['sequence', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const invalidSchema = { 'additionalProperties': false, 'properties': { 'sequence': sequenceSchema, 'type': { 'const': 'invalid' } }, 'required': ['sequence', 'type'], 'type': 'object' } as const;
const invalidNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'sequence': sequenceNode, 'type': SchemaNode.defineConst({}, 'invalid' as const) }, ['sequence', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Event of the pipeline workflow demo machine: begin, or a complete/invalid event carrying the stage sequence. */
export namespace MachinePipelineEventEntity {
  export const Schema = { 'oneOf': [beginSchema, completeSchema, invalidSchema] } as const;

  export const Node = SchemaNode.defineOneOf({}, [beginNode, completeNode, invalidNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
