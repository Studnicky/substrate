import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A finite number, or a named non-finite number (`infinity`, `nan`, `negative-infinity`) that JSON cannot carry. */
export namespace RuntimeNumberEntity {
  export const Schema = {
    'oneOf': [
      { 'type': 'number' },
      { 'additionalProperties': false, 'properties': { 'shape': { 'enum': ['infinity', 'nan', 'negative-infinity'] } }, 'required': ['shape'], 'type': 'object' }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineEnum({}, ['infinity', 'nan', 'negative-infinity'] as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
