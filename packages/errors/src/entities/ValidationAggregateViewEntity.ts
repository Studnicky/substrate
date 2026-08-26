import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Compact rollup of deduplicated paths and keywords with a total error count. */
export namespace ValidationAggregateViewEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationAggregateView',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'keywords': {
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'paths': {
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'required': ['count', 'keywords', 'paths'],
    'title': 'ValidationAggregateView',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (!Predicates.isNumber(candidate.count)) { return false; }
    if (!Predicates.isArray(candidate.keywords) || !candidate.keywords.every((keyword) => { const result = Predicates.isString(keyword); return result; })) { return false; }
    if (!Predicates.isArray(candidate.paths) || !candidate.paths.every((path) => { const result = Predicates.isString(path); return result; })) { return false; }
    return true;
  };

  class Parser {
    public static parseStrings(value: Parameters<EntityIntakeFunctionInterface<never>>[0]): string[] | undefined {
      if (!Array.isArray(value)) { return undefined; }
      const result: string[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const string = EntityIntake.string(value[index]);
        if (string === undefined) { return undefined; }
        result.push(string);
      }
      return result;
    }

    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['count', 'keywords', 'paths'])) { return undefined; }
      const count = EntityIntake.number(candidate.count);
      const keywords = Parser.parseStrings(candidate.keywords);
      const paths = Parser.parseStrings(candidate.paths);
      if (count === undefined || keywords === undefined || paths === undefined) { return undefined; }
      return { 'count': count, 'keywords': keywords, 'paths': paths };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationAggregateView');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationAggregateView');
}
