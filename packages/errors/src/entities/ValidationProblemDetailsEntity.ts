import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';
import { ValidationViolationEntity } from './ValidationViolationEntity.js';

/** RFC 7807 Problem Details payload for validation failure HTTP responses. */
export namespace ValidationProblemDetailsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationProblemDetails',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'detail': { 'type': 'string' },
      'errors': {
        'items': ValidationViolationEntity.Schema,
        'type': 'array'
      },
      'status': { 'type': 'number' },
      'title': { 'type': 'string' },
      'type': { 'type': 'string' }
    },
    'required': ['detail', 'errors', 'status', 'title', 'type'],
    'title': 'ValidationProblemDetails',
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
    if (!Predicates.isString(candidate.detail)) { return false; }
    if (!Predicates.isNumber(candidate.status)) { return false; }
    if (!Predicates.isString(candidate.title)) { return false; }
    if (!Predicates.isString(candidate.type)) { return false; }
    if (!Predicates.isArray(candidate.errors)) { return false; }
    const errorsLength = candidate.errors.length;
    for (let errorIndex = 0; errorIndex < errorsLength; errorIndex += 1) {
      if (!ValidationViolationEntity.validate(Reflect.get(candidate.errors, errorIndex))) { return false; }
    }
    return true;
  };

  class Parser {
    public static parseViolations(value: Parameters<EntityIntakeFunctionInterface<never>>[0], intake: boolean): ValidationViolationEntity.Type[] | undefined {
      if (!Array.isArray(value)) { return undefined; }
      const result: ValidationViolationEntity.Type[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value[index];
        if (intake) {
          result.push(ValidationViolationEntity.intake(item));
          continue;
        }
        if (!ValidationViolationEntity.validate(item)) { return undefined; }
        const violation = ValidationViolationEntity.create(item);
        result.push(violation);
      }
      return result;
    }

    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['detail', 'errors', 'status', 'title', 'type'])) { return undefined; }
      const detail = EntityIntake.string(candidate.detail);
      const errors = Parser.parseViolations(candidate.errors, !options.rejectUnknownProperties);
      const status = EntityIntake.number(candidate.status);
      const title = EntityIntake.string(candidate.title);
      const type = EntityIntake.string(candidate.type);
      if (detail === undefined || errors === undefined || status === undefined || title === undefined || type === undefined) { return undefined; }
      return { 'detail': detail, 'errors': errors, 'status': status, 'title': title, 'type': type };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationProblemDetails');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationProblemDetails');
}
