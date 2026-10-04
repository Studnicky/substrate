import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace TimingEventDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': {
        'description':
          "The formatted event name. Format: 'component.operation' or 'component.operation.status'",
        'type': 'string'
      }
    },
    'required': ['event'],
    'type': 'object'
  } as const;

  /**
   * Output of TimingEvent.create().
   * Represents a fully validated timing event.
   */
  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'event': SchemaNode.defineString({
        'description':
          "The formatted event name. Format: 'component.operation' or 'component.operation.status'",
        'type': 'string'
      } as const)
    },
    ['event'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
