import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
