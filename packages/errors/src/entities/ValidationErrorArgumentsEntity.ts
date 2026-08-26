import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityIntakeFunctionInterface } from '../interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

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
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    const hasUnknownKey = Object.keys(candidate).some((key) => { const result = !ALLOWED_KEYS.has(key); return result; });
    if (hasUnknownKey) { return false; }
    if (!Predicates.isString(candidate.message)) { return false; }
    if (!Predicates.isString(candidate.path)) { return false; }
    if (candidate.correlationId !== undefined && !Predicates.isString(candidate.correlationId)) { return false; }
    if (candidate.violations === undefined) { return true; }
    if (!Predicates.isArray(candidate.violations)) { return false; }
    const violationsLength = candidate.violations.length;
    for (let violationIndex = 0; violationIndex < violationsLength; violationIndex += 1) {
      if (!ValidationViolationDetailEntity.validate(Reflect.get(candidate.violations, violationIndex))) { return false; }
    }
    return true;
  };

  class Parser {
    public static parseViolations(value: Parameters<EntityIntakeFunctionInterface<never>>[0], intake: boolean): ValidationViolationDetailEntity.Type[] | undefined {
      if (!Array.isArray(value)) { return undefined; }
      const result: ValidationViolationDetailEntity.Type[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value[index];
        if (intake) {
          result.push(ValidationViolationDetailEntity.intake(item));
          continue;
        }
        if (!ValidationViolationDetailEntity.validate(item)) { return undefined; }
        const violation = ValidationViolationDetailEntity.create(item);
        result.push(violation);
      }
      return result;
    }

    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['correlationId', 'message', 'path', 'violations'])) { return undefined; }
      const message = EntityIntake.string(candidate.message);
      const path = EntityIntake.string(candidate.path);
      if (message === undefined || path === undefined) { return undefined; }
      let correlationId: string | undefined;
      if (candidate.correlationId !== undefined) {
        correlationId = EntityIntake.string(candidate.correlationId);
        if (correlationId === undefined) { return undefined; }
      }
      let violations: ValidationViolationDetailEntity.Type[] | undefined;
      if (candidate.violations !== undefined) {
        violations = Parser.parseViolations(candidate.violations, !options.rejectUnknownProperties);
        if (violations === undefined) { return undefined; }
      }
      if (correlationId === undefined) {
        if (violations === undefined) { return { 'message': message, 'path': path }; }
        return { 'message': message, 'path': path, 'violations': violations };
      }
      if (violations === undefined) { return { 'correlationId': correlationId, 'message': message, 'path': path }; }
      return { 'correlationId': correlationId, 'message': message, 'path': path, 'violations': violations };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationErrorArguments');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationErrorArguments');
}
