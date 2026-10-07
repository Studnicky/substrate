import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogFaultDataEntity } from './LogFaultDataEntity.js';

/** Structured data accepted by logger methods. */
export namespace LogDataEntity {
  export const Schema = {
    'oneOf': [LogBodyDataEntity.Schema, LogFaultDataEntity.Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [LogBodyDataEntity.Node, LogFaultDataEntity.Node]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
