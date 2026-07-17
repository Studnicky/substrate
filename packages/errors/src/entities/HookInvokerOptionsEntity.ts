import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export function validate(candidate: unknown): candidate is Type {
    const record = Guard.asRecord(candidate);
    if (record === undefined) { return false; }
    if (record.detectReentrancy !== undefined && typeof record.detectReentrancy !== 'boolean') { return false; }
    if (record.timeoutMs !== undefined && (typeof record.timeoutMs !== 'number' || !Number.isFinite(record.timeoutMs) || record.timeoutMs <= 0)) { return false; }
    return true;
  }
}
