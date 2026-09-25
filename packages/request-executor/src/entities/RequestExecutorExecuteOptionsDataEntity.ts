import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { RequestDeadlineEntity } from './RequestDeadlineEntity.js';

/** Serializable per-call configuration accepted by `RequestExecutor.execute()`. */
export namespace RequestExecutorExecuteOptionsDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestExecutorExecuteOptionsData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'deadlineMs': RequestDeadlineEntity.Schema.properties.deadlineMs,
      'scopeInitial': {
        'additionalProperties': true,
        'type': 'object'
      }
    },
    'title': 'RequestExecutorExecuteOptionsData',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'title': 'RequestExecutorExecuteOptionsData', 'type': 'object' } as const,
    {
      'deadlineMs': RequestDeadlineEntity.Node.schema.properties.deadlineMs,
      'scopeInitial': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true })
    },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
