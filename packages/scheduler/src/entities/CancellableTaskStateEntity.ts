import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable lifecycle state for a single cancellable task. */
export namespace CancellableTaskStateEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'variant': { 'enum': ['pending', 'cancelled', 'completed'], 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'type': 'object' } as const, { 'variant': SchemaNode.defineEnum({}, ['pending', 'cancelled', 'completed'] as const) }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
