import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

/** Fully defaulted adaptive configuration retained by a throttle instance. */
export namespace ValidatedAdaptiveConfigEntity {
  export const Schema = {
    ...AdaptiveConfigEntity.Schema,
    'anyOf': [
      {
        'properties': {
          'enabled': { 'const': false }
        }
      },
      {
        'properties': {
          'enabled': { 'const': true },
          'targetLatencyMs': {
            'exclusiveMinimum': 0,
            'type': 'number'
          }
        }
      }
    ],
    'properties': {
      ...AdaptiveConfigEntity.Schema.properties,
      'targetLatencyMs': {
        'description': 'Target latency in milliseconds for p95, or zero when adaptive concurrency is disabled.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': [
      'adjustmentInterval',
      'enabled',
      'maximumConcurrency',
      'minimumConcurrency',
      'sampleWindow',
      'scaleDownThreshold',
      'scaleUpThreshold',
      'stepSize',
      'targetLatencyMs'
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
