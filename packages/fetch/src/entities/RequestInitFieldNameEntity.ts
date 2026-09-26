import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** RequestInit fields RequestInitEncoder projects; the sole source of that projection's field set. */
export namespace RequestInitFieldNameEntity {
  export const Schema = {
    'enum': [
      'body', 'cache', 'credentials', 'duplex', 'headers', 'integrity', 'keepalive',
      'method', 'mode', 'redirect', 'referrer', 'referrerPolicy', 'window'
    ],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, [
    'body', 'cache', 'credentials', 'duplex', 'headers', 'integrity', 'keepalive',
    'method', 'mode', 'redirect', 'referrer', 'referrerPolicy', 'window'
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
