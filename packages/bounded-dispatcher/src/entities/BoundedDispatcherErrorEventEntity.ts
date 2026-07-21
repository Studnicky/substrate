import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace BoundedDispatcherErrorEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'phase': { 'const': 'error', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export function validate(candidate: unknown): candidate is Type {
    return typeof candidate === 'object'
      && candidate !== null
      && Object.hasOwn(candidate, 'phase')
      && Object.keys(candidate).length === 1
      && Reflect.get(candidate, 'phase') === 'error';
  }
}
