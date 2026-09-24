import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DateRangeBoundEntity } from './DateRangeBoundEntity.js';

/** Declarative date range boundaries expressed as JSON-safe date values. */
export namespace DateRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inclusive': { 'type': 'boolean' },
      'maximum': DateRangeBoundEntity.Schema,
      'minimum': DateRangeBoundEntity.Schema
    },
    'required': ['maximum', 'minimum'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'inclusive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'maximum': DateRangeBoundEntity.Node, 'minimum': DateRangeBoundEntity.Node }, ['maximum', 'minimum'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
