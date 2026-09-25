import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { RequestDeadlineEntity } from './RequestDeadlineEntity.js';

/** Serializable configuration retained by a request executor. */
export namespace RequestExecutorConfigDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestExecutorConfigData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'deadlineMs': RequestDeadlineEntity.Schema.properties.deadlineMs
    },
    'title': 'RequestExecutorConfigData',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'title': 'RequestExecutorConfigData', 'type': 'object' } as const,
    { 'deadlineMs': RequestDeadlineEntity.Node.schema.properties.deadlineMs },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
