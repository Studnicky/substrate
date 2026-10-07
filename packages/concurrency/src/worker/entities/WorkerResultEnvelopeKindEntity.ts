import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Canonical result-envelope discriminator used by the generic runtime envelope contract. */
export namespace WorkerResultEnvelopeKindEntity {
  export const Schema = {
    'enum': ['result'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({ 'type': 'string' } as const, ['result'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
