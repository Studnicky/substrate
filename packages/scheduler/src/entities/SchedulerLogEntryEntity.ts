import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace SchedulerLogEntryEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/SchedulerLogEntry',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'A single lifecycle event recorded by a logging scheduler.',
    'properties': {
      'event': {
        'enum': ['schedule', 'fire'],
        'type': 'string'
      },
      'id': {
        'type': 'string'
      }
    },
    'required': ['event', 'id'],
    'title': 'SchedulerLogEntry',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/SchedulerLogEntry', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'A single lifecycle event recorded by a logging scheduler.', 'title': 'SchedulerLogEntry', 'type': 'object' } as const, { 'event': SchemaNode.defineEnum({}, ['schedule', 'fire'] as const), 'id': SchemaNode.defineString({
    'type': 'string'
  } as const) }, ['event', 'id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
