import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

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
  export const validate = (candidate: unknown): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    if (typeof candidate.detail !== 'string') { return false; }
    if (typeof candidate.status !== 'number') { return false; }
    if (typeof candidate.title !== 'string') { return false; }
    if (typeof candidate.type !== 'string') { return false; }
    if (!Array.isArray(candidate.errors)) { return false; }
    const errorsLength = candidate.errors.length;
    for (let errorIndex = 0; errorIndex < errorsLength; errorIndex += 1) {
      if (!ValidationViolationEntity.validate(Reflect.get(candidate.errors, errorIndex))) { return false; }
    }
    return true;
  };

  const parseViolations = (value: unknown, intake: boolean): ValidationViolationEntity.Type[] | undefined => {
    if (!Array.isArray(value)) { return undefined; }
    const result: ValidationViolationEntity.Type[] = [];
    for (const item of value) {
      const violation = intake ? ValidationViolationEntity.intake(item) : ValidationViolationEntity.create(item);
      result.push(violation);
    }
    return result;
  };

  const parser = (candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['detail', 'errors', 'status', 'title', 'type'])) { return undefined; }
    const detail = EntityIntake.string(candidate.detail, options.coerce);
    const errors = parseViolations(candidate.errors, options.coerce);
    const status = EntityIntake.number(candidate.status, options.coerce);
    const title = EntityIntake.string(candidate.title, options.coerce);
    const type = EntityIntake.string(candidate.type, options.coerce);
    if (detail === undefined || errors === undefined || status === undefined || title === undefined || type === undefined) { return undefined; }
    return { 'detail': detail, 'errors': errors, 'status': status, 'title': title, 'type': type };
  };

  export const intake = EntityIntake.compileIntake(parser, 'ValidationProblemDetails');
  export const create = EntityIntake.compileCreate(parser, 'ValidationProblemDetails');
}
