import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DateGranularityValueEntity } from './DateGranularityValueEntity.js';

/** Fine-grained configuration for grouping bucket sizes. */
export namespace GranularityOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cidr': { 'type': 'integer' },
      'count': { 'type': 'integer' },
      'date': DateGranularityValueEntity.Schema,
      'density': { 'type': 'number' },
      'prefix': { 'type': 'integer' }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cidr': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'count': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'date': DateGranularityValueEntity.Node, 'density': SchemaNode.defineNumber({ 'type': 'number' } as const), 'prefix': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
