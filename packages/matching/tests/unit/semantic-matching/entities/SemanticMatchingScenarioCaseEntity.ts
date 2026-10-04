import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The scenario shape `SemanticMatching.loop.spec.ts` exercises. */
export namespace SemanticMatchingScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expected': {
        'additionalProperties': false,
        'properties': { 'modelIdentity': { 'type': 'string' }, 'resultId': { 'type': 'string' } },
        'required': ['modelIdentity', 'resultId'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'content': { 'type': 'string' }, 'id': { 'type': 'string' }, 'namespace': { 'type': 'string' } },
        'required': ['content', 'id', 'namespace'],
        'type': 'object'
      },
      'name': { 'type': 'string' },
      'shape': { 'const': 'vector-search' }
    },
    'required': ['expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'modelIdentity': SchemaNode.defineString({ 'type': 'string' } as const),
      'resultId': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['modelIdentity', 'resultId'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'id': SchemaNode.defineString({ 'type': 'string' } as const),
      'namespace': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['content', 'id', 'namespace'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'vector-search' as const)
  }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
