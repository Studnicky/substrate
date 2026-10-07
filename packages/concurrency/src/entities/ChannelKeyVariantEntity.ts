import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/**
 * Per-key lifecycle variant for `Channel`, the product of the `closed` and
 * `subscriber` flags a key can independently carry (a key can be closed
 * while a subscriber is still draining its buffer).
 */
export namespace ChannelKeyVariantEntity {
  export const Schema = {
    'enum': ['open-idle', 'open-subscribed', 'closed-idle', 'closed-subscribed'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['open-idle', 'open-subscribed', 'closed-idle', 'closed-subscribed'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
