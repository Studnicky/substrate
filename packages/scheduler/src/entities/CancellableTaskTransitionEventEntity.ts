import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { CancellableTaskStateEntity } from './CancellableTaskStateEntity.js';

/** Serializable event that requests a cancellable task lifecycle transition. */
export namespace CancellableTaskTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': CancellableTaskStateEntity.Schema.properties.variant,
      'type': { 'const': 'transitionTo', 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'to': CancellableTaskStateEntity.Node.schema.properties.variant,
    'type': SchemaNode.defineConst({}, 'transitionTo' as const)
  }, ['to', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
