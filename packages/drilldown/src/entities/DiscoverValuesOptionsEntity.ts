import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DiscoveryStrategyEntity } from './DiscoveryStrategyEntity.js';
import { GranularityOptionsEntity } from './GranularityOptionsEntity.js';

/** Configuration options for automatic value discovery. */
export namespace DiscoverValuesOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'granularity': GranularityOptionsEntity.Schema,
      'maximumValues': { 'type': 'integer' },
      'strategy': DiscoveryStrategyEntity.Schema,
      'type': { 'enum': ['date', 'ip', 'number', 'semver', 'string'] }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'granularity': GranularityOptionsEntity.Node, 'maximumValues': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'strategy': DiscoveryStrategyEntity.Node, 'type': SchemaNode.defineEnum({}, ['date', 'ip', 'number', 'semver', 'string'] as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
