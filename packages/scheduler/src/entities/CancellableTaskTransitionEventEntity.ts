import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { CancellableTaskStateEntity } from './CancellableTaskStateEntity.js';

/**
 * Requests a transition of a task's lifecycle state to `to`. Mirrors the
 * target-state argument style `MutexKeyMachine`/`ContextScopeMachine` use —
 * the reducer decides whether `to` is reachable from the current state.
 */
export namespace CancellableTaskTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': CancellableTaskStateEntity.Schema,
      'type': { 'const': 'transitionTo', 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
