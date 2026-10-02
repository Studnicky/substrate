import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ScenarioJsonValueNode } from '../schema/ScenarioJsonValueNode.js';

/** Finite, acyclic JSON data read out of a test fixture file — null/boolean/number/string/array/record, recursively. */
export namespace ScenarioJsonValueEntity {
  export const Schema = {
    '$defs': {
      'ScenarioJsonValue': {
        'anyOf': [
          { 'type': 'null' },
          { 'type': 'boolean' },
          { 'type': 'number' },
          { 'type': 'string' },
          { 'items': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'array' },
          { 'additionalProperties': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'object' }
        ]
      }
    },
    '$ref': '#/$defs/ScenarioJsonValue',
    'title': 'ScenarioJsonValue'
  } as const;

  export const Node = SchemaNode.defineReference('#/$defs/ScenarioJsonValue', ScenarioJsonValueNode, 'ScenarioJsonValue');
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
