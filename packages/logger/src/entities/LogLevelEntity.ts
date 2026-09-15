import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Numeric log levels ordered from TRACE through SILENT. */
export namespace LogLevelEntity {
  export const Schema = {
    'description': 'Numeric log level ordered from TRACE through SILENT.',
    'enum': [0, 1, 2, 3, 4, 5],
    'type': 'integer'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
