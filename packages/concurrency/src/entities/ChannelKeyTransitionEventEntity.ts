import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ChannelKeyTransitionTypeEntity } from './ChannelKeyTransitionTypeEntity.js';

/** Canonical lifecycle transition request for Channel keys. */
export namespace ChannelKeyTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': ChannelKeyTransitionTypeEntity.Schema
    },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': ChannelKeyTransitionTypeEntity.Node }, ['type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
