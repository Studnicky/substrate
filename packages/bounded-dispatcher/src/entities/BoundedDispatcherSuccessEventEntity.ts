import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace BoundedDispatcherSuccessEventEntity {
  class SuccessEventValidator {
    static validate(candidate: unknown): candidate is Type {
      if (candidate === null) {
        return false;
      }
      const result = typeof candidate === 'object'
        && Object.hasOwn(candidate, 'phase')
        && Object.keys(candidate).length === 1
        && Reflect.get(candidate, 'phase') === 'success';
      return result;
    }
  }

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'phase': { 'const': 'success', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: unknown): candidate is Type => {
    const result = SuccessEventValidator.validate(candidate);
    return result;
  };
}
