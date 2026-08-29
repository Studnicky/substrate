import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import { FilterConfigurationError } from './errors/FilterConfigurationError.js';

/**
 * The JSON-safe value domain FilterEngine conditions and data operate over.
 * Bounded to 5 levels of array/object nesting at the type level — json-schema-to-ts's
 * self-referential ($ref: '#') recursion hits TS2589 (verified), and real filter data is
 * never meaningfully deeper than this in practice. FilterValueGuard.intake's actual runtime
 * recursion is unbounded and also accepts Date/Set/Map (normalized via the ValueCoders
 * registry) — this static type is deliberately narrower than what the runtime guard accepts.
 */
export namespace FilterValueEntity {
  const leaf = {
    'anyOf': [{ 'type': 'string' }, { 'type': 'number' }, { 'type': 'boolean' }, { 'type': 'null' }]
  } as const;
  const level1 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': leaf, 'type': 'array' },
      { 'additionalProperties': leaf, 'type': 'object' }
    ]
  } as const;
  const level2 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level1, 'type': 'array' },
      { 'additionalProperties': level1, 'type': 'object' }
    ]
  } as const;
  const level3 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level2, 'type': 'array' },
      { 'additionalProperties': level2, 'type': 'object' }
    ]
  } as const;
  const level4 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level3, 'type': 'array' },
      { 'additionalProperties': level3, 'type': 'object' }
    ]
  } as const;

  export const Schema = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level4, 'type': 'array' },
      { 'additionalProperties': level4, 'type': 'object' }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  // Hand-rolled, not SchemaValidator.compile — @studnicky/json depends on @studnicky/types,
  // so importing SchemaValidator here would be circular.
  export function validate(candidate: unknown): candidate is Type {
    if (candidate === null || Predicates.isString(candidate) || Predicates.isNumber(candidate) || Predicates.isBoolean(candidate)) {
      return true;
    }
    if (Predicates.isArray(candidate)) {
      const result = candidate.every((item) => {
        const itemResult = FilterValueEntity.validate(item);

        return itemResult;
      });

      return result;
    }
    if (Predicates.isRecord(candidate)) {
      const result = Object.values(candidate).every((item) => {
        const itemResult = FilterValueEntity.validate(item);

        return itemResult;
      });

      return result;
    }

    return false;
  }

  class Intake {
    static intake(candidate: unknown): Type {
      if (!FilterValueEntity.validate(candidate)) {
        throw new FilterConfigurationError('Not a valid FilterValueEntity.Type', {});
      }

      return candidate;
    }
  }

  export const intake = Intake.intake;
}
