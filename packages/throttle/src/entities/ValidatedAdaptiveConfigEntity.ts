import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';

import { EntityCompiler } from '@studnicky/entity/browser';

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
  } as const;

  // Hand-authored: `anyOf` refines on the value of `enabled` — a conditional discriminant no structural derivation expresses.
  export type Type = {
    'adjustmentInterval': number;
    'maximumConcurrency': number;
    'minimumConcurrency': number;
    'sampleWindow': number;
    'scaleDownThreshold': number;
    'scaleUpThreshold': number;
    'stepSize': number;
  } & ({ 'enabled': false; 'targetLatencyMs': number } | { 'enabled': true; 'targetLatencyMs': number });

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
