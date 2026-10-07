import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/HookInvokerOptions', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'HookInvokerOptions', 'type': 'object' } as const, { 'detectReentrancy': SchemaNode.defineBoolean({
    'description': 'When true, a synchronous, same-call-stack reentrant call to invoke throws ReentrantHookInvocationError instead of recursing.',
    'type': 'boolean'
  } as const), 'timeoutMs': SchemaNode.defineNumber({
    'description': 'When set, an asynchronous hook result races against this timeout in milliseconds.',
    'exclusiveMinimum': 0,
    'type': 'number'
  } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
