import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The scenario shape `TopicRouterModels.loop.spec.ts` exercises. */
export namespace TopicRouterModelsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expected': {
        'additionalProperties': false,
        'properties': { 'id': { 'type': 'string' }, 'origin': { 'type': 'string' }, 'score': { 'type': 'number' } },
        'required': ['id', 'origin', 'score'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'content': { 'type': 'string' }, 'id': { 'type': 'string' }, 'origin': { 'type': 'string' }, 'score': { 'type': 'number' } },
        'required': ['content', 'id', 'origin', 'score'],
        'type': 'object'
      },
      'name': { 'type': 'string' },
      'shape': { 'const': 'inference-to-selection' }
    },
    'required': ['expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'id': SchemaNode.defineString({ 'type': 'string' } as const),
      'origin': SchemaNode.defineString({ 'type': 'string' } as const),
      'score': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['id', 'origin', 'score'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'id': SchemaNode.defineString({ 'type': 'string' } as const),
      'origin': SchemaNode.defineString({ 'type': 'string' } as const),
      'score': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['content', 'id', 'origin', 'score'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'inference-to-selection' as const)
  }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
