import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { TIMING_STATUS } from '../constants/index.js';

/** Canonical status suffix accepted by timing events. */
export namespace TimingStatusEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': [
      TIMING_STATUS.ABORT,
      TIMING_STATUS.ACQUIRED,
      TIMING_STATUS.COMPLETE,
      TIMING_STATUS.DEQUEUED,
      TIMING_STATUS.ERROR,
      TIMING_STATUS.HIT,
      TIMING_STATUS.MISS,
      TIMING_STATUS.QUEUED,
      TIMING_STATUS.RELEASED,
      TIMING_STATUS.START,
      TIMING_STATUS.TIMEOUT,
      TIMING_STATUS.WAITING
    ],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
