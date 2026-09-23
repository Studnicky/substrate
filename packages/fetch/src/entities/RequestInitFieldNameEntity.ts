import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/browser';

/** RequestInit fields RequestInitEncoder projects; the sole source of that projection's field set. */
export namespace RequestInitFieldNameEntity {
  export const Schema = {
    'enum': [
      'body', 'cache', 'credentials', 'duplex', 'headers', 'integrity', 'keepalive',
      'method', 'mode', 'redirect', 'referrer', 'referrerPolicy', 'window'
    ],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
