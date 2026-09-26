import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Cache-access event recorded by the EventRecorder example. */
export namespace CacheEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'enum': ['hit', 'miss'], 'type': 'string' },
      'key': { 'type': 'string' }
    },
    'required': ['event', 'key'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineEnum({}, ['hit', 'miss'] as const), 'key': SchemaNode.defineString({ 'type': 'string' } as const) }, ['event', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
