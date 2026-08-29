import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import { FilterConfigurationError } from './errors/FilterConfigurationError.js';

/**
 * One array-logic registry-key (EVERY/SOME/NONE/ONE, or a custom registered name) per
 * array wildcard segment ([*]) in a condition's path.
 */
export namespace GroupGateNamesEntity {
  export const Schema = {
    'items': { 'type': 'string' },
    'type': 'array'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  // Hand-rolled, not SchemaValidator.compile — @studnicky/json depends on @studnicky/types,
  // so importing SchemaValidator here would be circular.
  export function validate(candidate: unknown): candidate is Type {
    if (!Predicates.isArray(candidate)) {
      return false;
    }
    const result = candidate.every((item) => {
      const itemResult = Predicates.isString(item);

      return itemResult;
    });

    return result;
  }

  class Intake {
    static intake(candidate: unknown): Type {
      if (!GroupGateNamesEntity.validate(candidate)) {
        throw new FilterConfigurationError('Not a valid GroupGateNamesEntity.Type', {});
      }

      return candidate;
    }
  }

  export const intake = Intake.intake;
}
