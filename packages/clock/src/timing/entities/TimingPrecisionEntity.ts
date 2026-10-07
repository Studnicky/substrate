import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DEFAULT_DECIMAL_PRECISION, VALID_TIME_UNITS } from '../constants/index.js';

/** Decimal precision configuration keyed by supported time unit. */
export namespace TimingPrecisionEntity {
  const PrecisionPropertySchema = {
    'maximum': 20,
    'minimum': 0,
    'type': 'integer'
  } as const;

  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Decimal precision configuration per time unit (h, m, ms, ns, s).',
    'properties': {
      'h': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.h },
      'm': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.m },
      'ms': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.ms },
      'ns': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.ns },
      's': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.s }
    },
    'propertyNames': { 'enum': VALID_TIME_UNITS },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'h': SchemaNode.defineNumber({
        'default': DEFAULT_DECIMAL_PRECISION.h,
        'maximum': 20,
        'minimum': 0,
        'type': 'integer'
      } as const),
      'm': SchemaNode.defineNumber({
        'default': DEFAULT_DECIMAL_PRECISION.m,
        'maximum': 20,
        'minimum': 0,
        'type': 'integer'
      } as const),
      'ms': SchemaNode.defineNumber({
        'default': DEFAULT_DECIMAL_PRECISION.ms,
        'maximum': 20,
        'minimum': 0,
        'type': 'integer'
      } as const),
      'ns': SchemaNode.defineNumber({
        'default': DEFAULT_DECIMAL_PRECISION.ns,
        'maximum': 20,
        'minimum': 0,
        'type': 'integer'
      } as const),
      's': SchemaNode.defineNumber({
        'default': DEFAULT_DECIMAL_PRECISION.s,
        'maximum': 20,
        'minimum': 0,
        'type': 'integer'
      } as const)
    },
    [] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
