import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DEFAULT_DECIMAL_PRECISION, DEFAULT_MAXIMUM_EVENTS } from '../constants/index.js';
import { TimingPrecisionEntity } from './TimingPrecisionEntity.js';

export namespace TimingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumEvents': {
        'default': DEFAULT_MAXIMUM_EVENTS,
        'description': 'Maximum number of events to store. Positive integer or null (sentinel for Infinity).',
        'oneOf': [
          { 'minimum': 1, 'type': 'integer' },
          { 'type': 'null' }
        ]
      },
      'precision': {
        ...TimingPrecisionEntity.Schema,
        'default': DEFAULT_DECIMAL_PRECISION
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'maximumEvents': SchemaNode.defineOneOf({ 'default': DEFAULT_MAXIMUM_EVENTS } as const, [
        SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const),
        SchemaNode.defineNull({ 'type': 'null' } as const)
      ]),
      'precision': SchemaNode.defineDecorated({ 'default': DEFAULT_DECIMAL_PRECISION } as const, TimingPrecisionEntity.Node)
    },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
