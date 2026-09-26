import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AddStageSpecEntity } from './AddStageSpecEntity.js';
import { IdentityStageSpecEntity } from './IdentityStageSpecEntity.js';
import { MulStageSpecEntity } from './MulStageSpecEntity.js';
import { SubStageSpecEntity } from './SubStageSpecEntity.js';
import { ThrowStageSpecEntity } from './ThrowStageSpecEntity.js';

/** Union of the five subclass stage spec shapes, discriminated by `shape`. */
export namespace SubclassStageSpecEntity {
  export const Schema = {
    'oneOf': [
      AddStageSpecEntity.Schema,
      IdentityStageSpecEntity.Schema,
      MulStageSpecEntity.Schema,
      SubStageSpecEntity.Schema,
      ThrowStageSpecEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    AddStageSpecEntity.Node,
    IdentityStageSpecEntity.Node,
    MulStageSpecEntity.Node,
    SubStageSpecEntity.Node,
    ThrowStageSpecEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
