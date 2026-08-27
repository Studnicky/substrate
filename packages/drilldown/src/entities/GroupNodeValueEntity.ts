import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { AlphabeticRangeEntity } from './AlphabeticRangeEntity.js';
import { CidrRangeEntity } from './CidrRangeEntity.js';
import { DateRangeEntity } from './DateRangeEntity.js';
import { OutlierMarkerEntity } from './OutlierMarkerEntity.js';
import { RangeEntity } from './RangeEntity.js';
import { SemverRangeEntity } from './SemverRangeEntity.js';
import { SequentialRangeEntity } from './SequentialRangeEntity.js';

/** Union of all possible values a resolved GroupNode can hold. */
export namespace GroupNodeValueEntity {
  export const Schema = {
    'oneOf': [
      AlphabeticRangeEntity.Schema,
      CidrRangeEntity.Schema,
      DateRangeEntity.Schema,
      OutlierMarkerEntity.Schema,
      RangeEntity.Schema,
      SemverRangeEntity.Schema,
      SequentialRangeEntity.Schema,
      { 'type': 'string' },
      { 'type': 'null' }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
