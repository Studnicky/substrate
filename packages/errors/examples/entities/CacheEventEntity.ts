import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }
    return (candidate.event === 'hit' || candidate.event === 'miss') && typeof candidate.key === 'string';
  }
}
