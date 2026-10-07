import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { VALID_TIME_UNITS } from '../constants/index.js';

/** Canonical time unit accepted by timing conversions and precision settings. */
export namespace TimeUnitEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': VALID_TIME_UNITS,
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, VALID_TIME_UNITS);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
