import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** One `onTransition` observation: the event type and the variants it moved between. */
export namespace PaginatorTransitionRecordEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'event': { 'type': 'string' }, 'from': { 'type': 'string' }, 'to': { 'type': 'string' } },
    'required': ['event', 'from', 'to'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineString({ 'type': 'string' } as const), 'from': SchemaNode.defineString({ 'type': 'string' } as const), 'to': SchemaNode.defineString({ 'type': 'string' } as const) }, ['event', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
