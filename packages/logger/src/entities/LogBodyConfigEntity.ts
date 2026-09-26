import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { LogStatusEntity } from './LogStatusEntity.js';

/** Direct configuration accepted by `LogBody.create()`. */
export namespace LogBodyConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogBodyConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for a normalized log entry.',
    'properties': {
      'component': {
        'description': 'Event component prefix.',
        'type': 'string'
      },
      'context': {
        'additionalProperties': {},
        'description': 'Freeform application data as a JSON blob.',
        'type': 'object'
      },
      'durationMs': {
        'description': 'Duration in milliseconds.',
        'minimum': 0,
        'type': 'number'
      },
      'message': {
        'description': 'Human-readable log message.',
        'type': 'string'
      },
      'operation': {
        'description': 'Event operation suffix.',
        'type': 'string'
      },
      'status': LogStatusEntity.Schema
    },
    'required': ['component', 'context', 'message', 'operation', 'status'],
    'title': 'LogBodyConfig',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/LogBodyConfig', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Configuration for a normalized log entry.', 'title': 'LogBodyConfig', 'type': 'object' } as const, { 'component': SchemaNode.defineString({
    'description': 'Event component prefix.',
    'type': 'string'
  } as const), 'context': SchemaNode.defineObject({ 'description': 'Freeform application data as a JSON blob.', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const), 'patternProperties': {} }), 'durationMs': SchemaNode.defineNumber({
    'description': 'Duration in milliseconds.',
    'minimum': 0,
    'type': 'number'
  } as const), 'message': SchemaNode.defineString({
    'description': 'Human-readable log message.',
    'type': 'string'
  } as const), 'operation': SchemaNode.defineString({
    'description': 'Event operation suffix.',
    'type': 'string'
  } as const), 'status': LogStatusEntity.Node }, ['component', 'context', 'message', 'operation', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
