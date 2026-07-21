import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

/** Options accepted by the `HookInvoker` constructor. */
export namespace HookInvokerOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/HookInvokerOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'detectReentrancy': {
        'description': 'When true, a synchronous, same-call-stack reentrant call to invoke throws ReentrantHookInvocationError instead of recursing.',
        'type': 'boolean'
      },
      'timeoutMs': {
        'description': 'When set, an asynchronous hook result races against this timeout in milliseconds.',
        'exclusiveMinimum': 0,
        'type': 'number'
      }
    },
    'title': 'HookInvokerOptions',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }
    if (candidate.detectReentrancy !== undefined && typeof candidate.detectReentrancy !== 'boolean') { return false; }
    if (candidate.timeoutMs !== undefined && (typeof candidate.timeoutMs !== 'number' || !Number.isFinite(candidate.timeoutMs) || candidate.timeoutMs <= 0)) { return false; }
    return true;
  }
}
