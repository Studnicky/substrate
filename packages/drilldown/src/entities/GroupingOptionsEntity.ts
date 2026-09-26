import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Configuration options for the automatic grouping algorithm. */
export namespace GroupingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'excludeProperties': { 'items': { 'type': 'string' }, 'type': 'array' },
      'groupCount': { 'type': 'integer' },
      'hideSingleValueGroups': { 'type': 'boolean' },
      'maximumDepth': { 'type': 'integer' },
      'minimumGroupSize': { 'type': 'integer' },
      'propertyPriority': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'excludeProperties': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'groupCount': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'hideSingleValueGroups': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'maximumDepth': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minimumGroupSize': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'propertyPriority': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
