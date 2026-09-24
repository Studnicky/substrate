import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** String names accepted for log-level configuration. */
export namespace LogLevelNameEntity {
  export const Schema = {
    'description': 'String name accepted for log-level configuration.',
    'enum': ['debug', 'error', 'info', 'silent', 'trace', 'warn'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum(['debug', 'error', 'info', 'silent', 'trace', 'warn'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
