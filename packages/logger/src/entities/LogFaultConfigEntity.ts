import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { LogBodyConfigEntity } from './LogBodyConfigEntity.js';

/** Direct configuration accepted by `LogFault.create()`. */
export namespace LogFaultConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogFaultConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for a normalized error log entry.',
    'properties': {
      ...LogBodyConfigEntity.Schema.properties,
      'cause': {
        'description': 'Underlying cause message.',
        'type': 'string'
      },
      'name': {
        'description': 'Error name or type.',
        'type': 'string'
      },
      'stack': {
        'description': 'Error stack trace.',
        'type': 'string'
      }
    },
    'required': [...LogBodyConfigEntity.Schema.required, 'name'],
    'title': 'LogFaultConfig',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'title': 'LogFaultConfig', 'type': 'object' } as const,
    {
      ...LogBodyConfigEntity.Node.schema.properties,
      'cause': SchemaNode.defineString({ 'description': 'Underlying cause message.', 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'description': 'Error name or type.', 'type': 'string' } as const),
      'stack': SchemaNode.defineString({ 'description': 'Error stack trace.', 'type': 'string' } as const)
    },
    [...LogBodyConfigEntity.Node.schema.required, 'name'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
