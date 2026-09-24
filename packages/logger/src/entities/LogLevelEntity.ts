import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Numeric log levels ordered from TRACE through SILENT. */
export namespace LogLevelEntity {
  export const Schema = {
    'description': 'Numeric log level ordered from TRACE through SILENT.',
    'enum': [0, 1, 2, 3, 4, 5],
    'type': 'integer'
  } as const;

  export const Node = SchemaNode.defineEnum([0, 1, 2, 3, 4, 5] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
