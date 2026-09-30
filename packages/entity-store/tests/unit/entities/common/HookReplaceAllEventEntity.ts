import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A recorded replace-all hook event. */
export namespace HookReplaceAllEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': {
        'type': 'number'
      },
      'event': {
        'const': 'replaceAll'
      }
    },
    'required': ['count', 'event'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'count': SchemaNode.defineNumber({
      'type': 'number'
    } as const),
    'event': SchemaNode.defineConst({}, 'replaceAll' as const)
  }, ['count', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
