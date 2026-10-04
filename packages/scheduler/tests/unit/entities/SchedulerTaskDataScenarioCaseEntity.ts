import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

// invalid-interval
const invalidIntervalSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'valid': { 'type': 'boolean' } }, 'required': ['valid'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'taskData': { 'additionalProperties': false, 'properties': { 'atMs': { 'type': 'number' }, 'intervalMs': { 'type': 'number' }, 'variant': { 'const': 'interval' } }, 'required': ['atMs', 'intervalMs', 'variant'], 'type': 'object' } }, 'required': ['taskData'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'invalid-interval' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const invalidIntervalNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'taskData': SchemaNode.defineObject({ 'type': 'object' } as const, { 'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'variant': SchemaNode.defineConst({}, 'interval' as const) }, ['atMs', 'intervalMs', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['taskData'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'invalid-interval' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// valid-task-data
const validTaskDataSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'valid': { 'type': 'boolean' } }, 'required': ['valid'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'taskData': { 'additionalProperties': false, 'properties': { 'atMs': { 'type': 'number' }, 'intervalMs': { 'type': 'number' }, 'variant': { 'const': 'interval' } }, 'required': ['atMs', 'intervalMs', 'variant'], 'type': 'object' } }, 'required': ['taskData'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'valid-task-data' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const validTaskDataNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'taskData': SchemaNode.defineObject({ 'type': 'object' } as const, { 'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'variant': SchemaNode.defineConst({}, 'interval' as const) }, ['atMs', 'intervalMs', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['taskData'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'valid-task-data' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Every distinct `shape` value the spec exercises, discriminated by the `shape` const field. */
export namespace SchedulerTaskDataScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      invalidIntervalSchema,
      validTaskDataSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    invalidIntervalNode,
    validTaskDataNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
