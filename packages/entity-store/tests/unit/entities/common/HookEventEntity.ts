import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { HookRemoveEventEntity } from './HookRemoveEventEntity.js';
import { HookReplaceAllEventEntity } from './HookReplaceAllEventEntity.js';
import { HookUpsertEventEntity } from './HookUpsertEventEntity.js';

/** Union of recorded EntityStore hook events, discriminated by `event`. */
export namespace HookEventEntity {
  export const Schema = {
    'oneOf': [
      HookUpsertEventEntity.Schema,
      HookRemoveEventEntity.Schema,
      HookReplaceAllEventEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HookUpsertEventEntity.Node,
    HookRemoveEventEntity.Node,
    HookReplaceAllEventEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
