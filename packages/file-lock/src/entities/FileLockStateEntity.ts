import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Canonical lifecycle state of a `FileLock` instance.
 *
 * - `acquiring` — the instance exists (so its protected hooks can fire) but
 *   `#acquire` has not yet renamed the target path into the lock path. Never
 *   observable outside `FileLock`: `FileLock.create()` does not return the
 *   instance to its caller until acquisition settles, and a failed
 *   acquisition discards the instance without transitioning it further.
 * - `held` — the rename succeeded; the caller owns the lock and may
 *   `read()`/`write()`/`release()` it.
 * - `released` — `release()` has run once; the target path has been renamed
 *   back. Terminal for the purposes of `release()`, which is idempotent.
 */
export namespace FileLockStateEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': ['acquiring', 'held', 'released'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
