import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';
import { ValidationViolationDetailEntity } from './ValidationViolationDetailEntity.js';

const ALLOWED_KEYS = new Set(['correlationId', 'message', 'path', 'violations']);

/** Construction arguments for `ValidationError`. */
export namespace ValidationErrorArgumentsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationErrorArguments',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'correlationId': {
        'description': 'Optional correlation ID for distributed tracing.',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable summary of the validation failure.',
        'type': 'string'
      },
      'path': {
        'description': 'JSON Pointer or field name identifying the invalid value.',
        'type': 'string'
      },
      'violations': {
        'description': 'Structured validation violations.',
        'items': ValidationViolationDetailEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationErrorArguments',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /** Validates construction arguments without introducing a dependency on `@studnicky/json`. */
  export const validate = (candidate: unknown): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    const hasUnknownKey = Object.keys(candidate).some((key) => { const result = !ALLOWED_KEYS.has(key); return result; });
    if (hasUnknownKey) { return false; }
    if (typeof candidate.message !== 'string') { return false; }
    if (typeof candidate.path !== 'string') { return false; }
    if (candidate.correlationId !== undefined && typeof candidate.correlationId !== 'string') { return false; }
    if (candidate.violations === undefined) { return true; }
    if (!Array.isArray(candidate.violations)) { return false; }
    const violationsLength = candidate.violations.length;
    for (let violationIndex = 0; violationIndex < violationsLength; violationIndex += 1) {
      if (!ValidationViolationDetailEntity.validate(Reflect.get(candidate.violations, violationIndex))) { return false; }
    }
    return true;
  };

  const parseViolations = (value: unknown, intake: boolean): ValidationViolationDetailEntity.Type[] | undefined => {
    if (!Array.isArray(value)) { return undefined; }
    const result: ValidationViolationDetailEntity.Type[] = [];
    for (const item of value) {
      const violation = intake ? ValidationViolationDetailEntity.intake(item) : ValidationViolationDetailEntity.create(item);
      result.push(violation);
    }
    return result;
  };

  const parser = (candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['correlationId', 'message', 'path', 'violations'])) { return undefined; }
    const message = EntityIntake.string(candidate.message, options.coerce);
    const path = EntityIntake.string(candidate.path, options.coerce);
    if (message === undefined || path === undefined) { return undefined; }
    let correlationId: string | undefined;
    if (candidate.correlationId !== undefined) {
      correlationId = EntityIntake.string(candidate.correlationId, options.coerce);
      if (correlationId === undefined) { return undefined; }
    }
    let violations: ValidationViolationDetailEntity.Type[] | undefined;
    if (candidate.violations !== undefined) {
      violations = parseViolations(candidate.violations, options.coerce);
      if (violations === undefined) { return undefined; }
    }
    if (correlationId === undefined) {
      if (violations === undefined) { return { 'message': message, 'path': path }; }
      return { 'message': message, 'path': path, 'violations': violations };
    }
    if (violations === undefined) { return { 'correlationId': correlationId, 'message': message, 'path': path }; }
    return { 'correlationId': correlationId, 'message': message, 'path': path, 'violations': violations };
  };

  export const intake = EntityIntake.compileIntake(parser, 'ValidationErrorArguments');
  export const create = EntityIntake.compileCreate(parser, 'ValidationErrorArguments');
}
