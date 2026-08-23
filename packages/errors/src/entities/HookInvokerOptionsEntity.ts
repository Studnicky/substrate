import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';

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
  export const validate = (candidate: unknown): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    if (candidate.detectReentrancy !== undefined && typeof candidate.detectReentrancy !== 'boolean') { return false; }
    if (candidate.timeoutMs !== undefined && (typeof candidate.timeoutMs !== 'number' || !Number.isFinite(candidate.timeoutMs) || candidate.timeoutMs <= 0)) { return false; }
    return true;
  };

  const parser = (candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['detectReentrancy', 'timeoutMs'])) { return undefined; }
    let detectReentrancy: boolean | undefined;
    if (candidate.detectReentrancy !== undefined) {
      detectReentrancy = EntityIntake.boolean(candidate.detectReentrancy, options.coerce);
      if (detectReentrancy === undefined) { return undefined; }
    }
    let timeoutMs: number | undefined;
    if (candidate.timeoutMs !== undefined) {
      timeoutMs = EntityIntake.number(candidate.timeoutMs, options.coerce);
      if (timeoutMs === undefined || timeoutMs <= 0) { return undefined; }
    }
    if (detectReentrancy === undefined) {
      if (timeoutMs === undefined) { return {}; }
      return { 'timeoutMs': timeoutMs };
    }
    if (timeoutMs === undefined) { return { 'detectReentrancy': detectReentrancy }; }
    return { 'detectReentrancy': detectReentrancy, 'timeoutMs': timeoutMs };
  };

  export const intake = EntityIntake.compileIntake(parser, 'HookInvokerOptions');
  export const create = EntityIntake.compileCreate(parser, 'HookInvokerOptions');
}
