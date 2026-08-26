import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Overrides applied when generating an RFC 7807 Problem Details payload. */
export namespace ValidationReportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationReportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'status': {
        'description': "HTTP status code (defaults to '422').",
        'type': 'number'
      },
      'title': {
        'description': "Human-readable title (defaults to 'Validation failed').",
        'type': 'string'
      },
      'type': {
        'description': "Problem type URI (defaults to 'https://problems.studnicky.dev/validation').",
        'type': 'string'
      }
    },
    'title': 'ValidationReportOptions',
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
    if (candidate.status !== undefined && typeof candidate.status !== 'number') { return false; }
    if (candidate.title !== undefined && typeof candidate.title !== 'string') { return false; }
    if (candidate.type !== undefined && typeof candidate.type !== 'string') { return false; }
    return true;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['status', 'title', 'type'])) { return undefined; }
      let status: number | undefined;
      let title: string | undefined;
      let type: string | undefined;
      if (candidate.status !== undefined) {
        status = EntityIntake.number(candidate.status, options.coerce);
        if (status === undefined) { return undefined; }
      }
      if (candidate.title !== undefined) {
        title = EntityIntake.string(candidate.title, options.coerce);
        if (title === undefined) { return undefined; }
      }
      if (candidate.type !== undefined) {
        type = EntityIntake.string(candidate.type, options.coerce);
        if (type === undefined) { return undefined; }
      }
      if (status === undefined) {
        if (title === undefined) {
          if (type === undefined) { return {}; }
          return { 'type': type };
        }
        if (type === undefined) { return { 'title': title }; }
        return { 'title': title, 'type': type };
      }
      if (title === undefined) {
        if (type === undefined) { return { 'status': status }; }
        return { 'status': status, 'type': type };
      }
      if (type === undefined) { return { 'status': status, 'title': title }; }
      return { 'status': status, 'title': title, 'type': type };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationReportOptions');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationReportOptions');
}
