import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Per-key lifecycle variant for `Channel`, the product of the `closed` and
 * `subscriber` flags a key can independently carry (a key can be closed
 * while a subscriber is still draining its buffer).
 */
export namespace ChannelKeyVariantEntity {
  export const Schema = {
    'enum': ['open-idle', 'open-subscribed', 'closed-idle', 'closed-subscribed'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
