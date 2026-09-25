import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { PROBLEM_STATUS_MAXIMUM, PROBLEM_STATUS_MINIMUM } from '../constants/ProblemConstants.js';

/** Overrides applied when generating an RFC 9457 Problem Details payload. */
export namespace ValidationReportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationReportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'status': {
        'description': "HTTP status code (defaults to '422').",
        'maximum': PROBLEM_STATUS_MAXIMUM,
        'minimum': PROBLEM_STATUS_MINIMUM,
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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ValidationReportOptions', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationReportOptions', 'type': 'object' } as const, { 'status': SchemaNode.defineNumber({
    'description': "HTTP status code (defaults to '422').",
    'maximum': PROBLEM_STATUS_MAXIMUM,
    'minimum': PROBLEM_STATUS_MINIMUM,
    'type': 'number'
  } as const), 'title': SchemaNode.defineString({
    'description': "Human-readable title (defaults to 'Validation failed').",
    'type': 'string'
  } as const), 'type': SchemaNode.defineString({
    'description': "Problem type URI (defaults to 'https://problems.studnicky.dev/validation').",
    'type': 'string'
  } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
