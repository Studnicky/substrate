import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Error with syscall information. */
export namespace ErrorWithSyscallEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithSyscall',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'syscall': { 'type': 'string' }
    },
    'required': ['syscall'],
    'title': 'ErrorWithSyscall',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithSyscall', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithSyscall', 'type': 'object' } as const, { 'syscall': SchemaNode.defineString({ 'type': 'string' } as const) }, ['syscall'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
