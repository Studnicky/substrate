import { ConfigurationError } from '@studnicky/config';
import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace AdaptiveConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adjustmentInterval': {
        'description': 'Minimum milliseconds between adjustments.',
        'minimum': 1,
        'type': 'integer'
      },
      'enabled': {
        'description': 'Whether adaptive concurrency is enabled.',
        'type': 'boolean'
      },
      'maxConcurrency': {
        'description': 'Maximum concurrency limit (ceiling).',
        'minimum': 1,
        'type': 'integer'
      },
      'minConcurrency': {
        'description': 'Minimum concurrency limit (floor).',
        'minimum': 1,
        'type': 'integer'
      },
      'sampleWindow': {
        'description': 'Number of samples in sliding window.',
        'minimum': 1,
        'type': 'integer'
      },
      'scaleDownThreshold': {
        'description': 'Scale down when p95 latency exceeds targetLatencyMs * scaleDownThreshold.',
        'exclusiveMinimum': 0,
        'type': 'number'
      },
      'scaleUpThreshold': {
        'description': 'Scale up when p95 latency is below targetLatencyMs * scaleUpThreshold.',
        'exclusiveMinimum': 0,
        'type': 'number'
      },
      'stepSize': {
        'description': 'Concurrency change per adjustment.',
        'minimum': 1,
        'type': 'integer'
      },
      'targetLatencyMs': {
        'description': 'Target latency in milliseconds for p95.',
        'exclusiveMinimum': 0,
        'type': 'number'
      }
    },
    'required': ['enabled'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export type AdaptiveConfigInputType = Partial<Omit<Required<Type>, 'enabled'>> & Pick<Required<Type>, 'enabled'>;

  const compiledValidate = SchemaValidator.compile<Type>(Schema);

  export function validate(candidate: unknown): candidate is Type {
    if (!compiledValidate(candidate)) {
      throw ConfigurationError.create(SchemaValidator.formatErrors(compiledValidate.errors));
    }
    return true;
  }
}
