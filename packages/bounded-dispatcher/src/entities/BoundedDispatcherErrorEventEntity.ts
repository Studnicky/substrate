import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace BoundedDispatcherErrorEventEntity {
  class ErrorEventValidator {
    static validate(candidate: unknown): candidate is Type {
      if (candidate === null) {
        return false;
      }
      const result = typeof candidate === 'object'
        && Object.hasOwn(candidate, 'phase')
        && Object.keys(candidate).length === 1
        && Reflect.get(candidate, 'phase') === 'error';
      return result;
    }
  }

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'phase': { 'const': 'error', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: unknown): candidate is Type => {
    const result = ErrorEventValidator.validate(candidate);
    return result;
  };
}
