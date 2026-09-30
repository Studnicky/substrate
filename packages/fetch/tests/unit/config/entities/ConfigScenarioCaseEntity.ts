import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../../helpers/entities/BoundedJsonValueEntity.js';

/** The `config.loop.spec.ts` scenario case shape: one branch per `outcome`. */
export namespace ConfigScenarioCaseEntity {
  const jsonObjectSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;

  export const Schema = { 'oneOf': [{ 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'messageIncludes': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['messageIncludes'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'fetchClient': jsonObjectSchema }, 'required': ['fetchClient'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'outcome': { 'const': 'throws' }, 'shape': { 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name', 'outcome', 'shape'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'fetchClient': jsonObjectSchema }, 'required': ['fetchClient'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'outcome': { 'const': 'ok' }, 'shape': { 'type': 'string' } }, 'required': ['description', 'expected', 'input', 'name', 'outcome', 'shape'], 'type': 'object' }] } as const;

  const JsonObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

  export const Node = SchemaNode.defineOneOf({}, [SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['messageIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': JsonObjectNode }, ['fetchClient'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'outcome': SchemaNode.defineConst({}, 'throws' as const), 'shape': SchemaNode.defineString({ 'type': 'string' } as const) }, ['description', 'expected', 'input', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchClient': JsonObjectNode }, ['fetchClient'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'outcome': SchemaNode.defineConst({}, 'ok' as const), 'shape': SchemaNode.defineString({ 'type': 'string' } as const) }, ['description', 'expected', 'input', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
