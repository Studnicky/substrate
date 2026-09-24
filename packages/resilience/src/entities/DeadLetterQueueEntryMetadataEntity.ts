import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical metadata attached to one dead-letter queue entry. */
export namespace DeadLetterQueueEntryMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enqueuedAtMs': { 'minimum': 0, 'type': 'number' },
      'id': { 'minLength': 1, 'type': 'string' },
      'reason': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['enqueuedAtMs', 'id', 'reason'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'enqueuedAtMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'id': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'reason': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['enqueuedAtMs', 'id', 'reason'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
