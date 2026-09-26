import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Universal semantic outcomes for logged operations. */
export namespace LogStatusEntity {
  export const Schema = {
    'description': 'Universal semantic outcome for a logged operation.',
    'enum': [
      'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found',
      'partial', 'pending', 'rate_limited', 'retry_exhausted', 'retrying',
      'skipped', 'success', 'timeout', 'unauthorized', 'unavailable'
    ],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, [
    'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found',
    'partial', 'pending', 'rate_limited', 'retry_exhausted', 'retrying',
    'skipped', 'success', 'timeout', 'unauthorized', 'unavailable'
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
