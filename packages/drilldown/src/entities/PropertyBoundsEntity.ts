import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Minimum/maximum profile for ordered property types discovered across a record set. */
export namespace PropertyBoundsEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'number' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'date' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineConst({}, 'number' as const) }, ['maximum', 'minimum', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineConst({}, 'date' as const) }, ['maximum', 'minimum', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} })]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
