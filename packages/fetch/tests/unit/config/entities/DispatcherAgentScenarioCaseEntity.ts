import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DispatcherConfigEntity } from '../../../../src/entities/DispatcherConfigEntity.js';
import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `dispatcher-agent.loop.spec.ts` scenario case shape: one branch per `shape`. */
export namespace DispatcherAgentScenarioCaseEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'options': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } }, 'required': ['options'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'dispatcherAgent': DispatcherConfigEntity.Schema }, 'required': ['dispatcherAgent'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'builds-agent' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} }) }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcherAgent': DispatcherConfigEntity.Node }, ['dispatcherAgent'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'builds-agent' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
