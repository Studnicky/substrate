import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Discriminator type for group value variants. */
export namespace GroupValueDiscriminantEntity {
  export const Schema = {
    'enum': ['alphabetic', 'cidr', 'date', 'range', 'semver', 'sequential', 'string'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['alphabetic', 'cidr', 'date', 'range', 'semver', 'sequential', 'string'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
