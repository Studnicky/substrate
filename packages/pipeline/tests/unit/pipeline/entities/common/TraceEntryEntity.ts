import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A single `{hook, index}` trace record `TracingPipeline` emits. */
export namespace TraceEntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'hook': { 'minLength': 1, 'type': 'string' }, 'index': { 'type': 'number' } },
    'required': ['hook', 'index'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'hook': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'index': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['hook', 'index'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
