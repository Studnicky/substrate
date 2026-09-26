import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 49 distinct scenario shapes `Clock.loop.spec.ts` exercises. */
export namespace ClockScenarioCaseEntity {
  const runtimeNumberSchema = {
    'oneOf': [
      { 'type': 'number' },
      { 'additionalProperties': false, 'properties': { 'shape': { 'enum': ['infinity', 'nan', 'negative-infinity'] } }, 'required': ['shape'], 'type': 'object' }
    ]
  } as const;

  const realTimeClockProviderOptionsSchema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'default' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': {
          'shape': { 'const': 'options' },
          'value': { 'additionalProperties': false, 'properties': { 'offsetMs': runtimeNumberSchema }, 'type': 'object' }
        },
        'required': ['shape'],
        'type': 'object'
      }
    ]
  } as const;

  const virtualTimeCounterOptionsSchema = {
    'oneOf': [
      { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'default' } }, 'required': ['shape'], 'type': 'object' },
      {
        'additionalProperties': false,
        'properties': {
          'shape': { 'const': 'options' },
          'value': { 'additionalProperties': false, 'properties': { 'startMs': runtimeNumberSchema }, 'type': 'object' }
        },
        'required': ['shape'],
        'type': 'object'
      }
    ]
  } as const;

  const objectFixtureSchema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'empty-object' } },
    'required': ['shape'],
    'type': 'object'
  } as const;

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'now-returns' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'ns': { 'type': 'string' }
        },
        'required': ['ns'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hrtime-returns' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'positive': { 'type': 'boolean' }
        },
        'required': ['positive'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-hrtime-positive' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'withinTolerance': { 'type': 'boolean' }
        },
        'required': ['withinTolerance'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-now-within-range' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'offset-invalid' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'providerFixture': objectFixtureSchema
        },
        'required': ['providerFixture'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clock-invalid-provider' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-invalid-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterFixture': objectFixtureSchema
        },
        'required': ['counterFixture'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-invalid-counter' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' }
        },
        'required': ['message'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-invalid-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'ok': { 'type': 'boolean' }
        },
        'required': ['ok'],
        'type': 'object'
      },
          'input': { 'additionalProperties': false, 'properties': {}, 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clock-error-with-cause' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'monotonic': { 'type': 'boolean' }
        },
        'required': ['monotonic'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'now-monotonic-same-instance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'monotonic': { 'type': 'boolean' }
        },
        'required': ['monotonic'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hrtime-monotonic-same-instance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'sameResults': { 'type': 'boolean' }
        },
        'required': ['sameResults'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'two-instances-independent' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'clamped': { 'type': 'boolean' }
        },
        'required': ['clamped'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema,
          'lowerCounterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions', 'lowerCounterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clamp-backwards-provider-values' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-advance-reflected' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['nowEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hooked-clock-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['nowEvents'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hooked-clock-on-now-clamped' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['nowEvents'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hooked-clock-on-now-advanced' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtimeEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['hrtimeEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hooked-clock-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtimeEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['hrtimeEvents'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hooked-clock-on-hrtime-repeat' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'result': { 'type': 'number' },
          'unhandledRejections': { 'type': 'number' }
        },
        'required': ['result', 'unhandledRejections'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema,
          'message': { 'type': 'string' }
        },
        'required': ['counterOptions', 'message'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clock-async-on-now-rejection-contained' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['nowEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['nowEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-on-now-offset' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtimeEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['hrtimeEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-default-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['nowEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'nowEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['nowEvents'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-on-now-advance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtimeEvents': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'number' }
        },
        'required': ['hrtimeEvents', 'result'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-counter-default-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-throws-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-provider-throws-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-throws-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-provider-throws-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookCalls': { 'prefixItems': [{ 'type': 'number' }, { 'type': 'number' }], 'type': 'array' }
        },
        'required': ['hookCalls'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-on-advance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookCalls': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['hookCalls'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advances': { 'items': { 'type': 'number' }, 'type': 'array' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advances', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-on-advance-suppressed' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookCalls': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['hookCalls'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advances': { 'items': { 'type': 'number' }, 'type': 'array' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advances', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-on-advance-sequence' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'values': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['values'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-on-now-ms' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'values': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['values'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-on-now-ms-repeat' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clock-throws-on-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clock-throws-on-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-throws-on-advance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hookError': { 'type': 'boolean' }
        },
        'required': ['hookError'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'counter-throws-on-now-ms' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'metered-clock-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtime': { 'type': 'string' }
        },
        'required': ['hrtime'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'advanceMs': { 'type': 'number' },
          'counterOptions': virtualTimeCounterOptionsSchema
        },
        'required': ['advanceMs', 'counterOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'metered-clock-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'offset-provider-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'offset-provider-offset' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'now': { 'type': 'number' }
        },
        'required': ['now'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema,
          'virtualMs': { 'type': 'number' }
        },
        'required': ['counterOptions', 'virtualMs'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'traced-virtual-provider-now' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'hrtime': { 'type': 'string' }
        },
        'required': ['hrtime'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'counterOptions': virtualTimeCounterOptionsSchema,
          'virtualMs': { 'type': 'number' }
        },
        'required': ['counterOptions', 'virtualMs'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'traced-virtual-provider-hrtime' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
        'additionalProperties': false,
        'properties': {
          'precise': { 'type': 'boolean' }
        },
        'required': ['precise'],
        'type': 'object'
      },
          'input': {
        'additionalProperties': false,
        'properties': {
          'rawMs': { 'type': 'number' },
          'realProviderOptions': realTimeClockProviderOptionsSchema
        },
        'required': ['rawMs', 'realProviderOptions'],
        'type': 'object'
      },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'long-uptime-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const RuntimeNumberNode = SchemaNode.defineOneOf([
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      { 'shape': SchemaNode.defineEnum(['infinity', 'nan', 'negative-infinity'] as const) },
      ['shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export const RealTimeClockProviderOptionsNode = SchemaNode.defineOneOf([
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('default' as const) }, ['shape'] as const, { 'additionalProperties': false }),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'shape': SchemaNode.defineConst('options' as const),
        'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'offsetMs': RuntimeNumberNode }, [] as const, { 'additionalProperties': false })
      },
      ['shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export const VirtualTimeCounterOptionsNode = SchemaNode.defineOneOf([
    SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('default' as const) }, ['shape'] as const, { 'additionalProperties': false }),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'shape': SchemaNode.defineConst('options' as const),
        'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'startMs': RuntimeNumberNode }, [] as const, { 'additionalProperties': false })
      },
      ['shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);

  export const ObjectFixtureNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'shape': SchemaNode.defineConst('empty-object' as const) },
    ['shape'] as const,
    { 'additionalProperties': false }
  );

  export type RuntimeNumber = NodeStaticType<typeof RuntimeNumberNode>;
  export type RuntimeNumberShape = Extract<RuntimeNumber, { shape: string }>['shape'];
  export type RealTimeClockProviderOptions = NodeStaticType<typeof RealTimeClockProviderOptionsNode>;
  export type VirtualTimeCounterOptions = NodeStaticType<typeof VirtualTimeCounterOptionsNode>;
  export type ObjectFixture = NodeStaticType<typeof ObjectFixtureNode>;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('now-returns' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'ns': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['ns'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hrtime-returns' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'positive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['positive'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-hrtime-positive' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'withinTolerance': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['withinTolerance'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-now-within-range' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['message'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('offset-invalid' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['message'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'providerFixture': ObjectFixtureNode
          },
          ['providerFixture'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clock-invalid-provider' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['message'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-invalid-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['message'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterFixture': ObjectFixtureNode
          },
          ['counterFixture'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-invalid-counter' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['message'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-invalid-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'ok': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['ok'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clock-error-with-cause' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'monotonic': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['monotonic'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('now-monotonic-same-instance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'monotonic': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['monotonic'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hrtime-monotonic-same-instance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'sameResults': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['sameResults'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('two-instances-independent' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'clamped': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['clamped'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode,
            'lowerCounterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions', 'lowerCounterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clamp-backwards-provider-values' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-advance-reflected' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['nowEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hooked-clock-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['nowEvents'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hooked-clock-on-now-clamped' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['nowEvents'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hooked-clock-on-now-advanced' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtimeEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['hrtimeEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hooked-clock-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtimeEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['hrtimeEvents'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hooked-clock-on-hrtime-repeat' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['result', 'unhandledRejections'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode,
            'message': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['counterOptions', 'message'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clock-async-on-now-rejection-contained' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['nowEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['nowEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-on-now-offset' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtimeEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['hrtimeEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-default-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['nowEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'nowEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['nowEvents'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-on-now-advance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtimeEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['hrtimeEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-counter-default-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-throws-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-provider-throws-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-throws-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-provider-throws-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookCalls': SchemaNode.defineTuple({ 'type': 'array' } as const, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)] as const)
          },
          ['hookCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-on-advance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookCalls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['hookCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advances': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advances', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-on-advance-suppressed' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookCalls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['hookCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advances': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advances', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-on-advance-sequence' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['values'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-on-now-ms' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          },
          ['values'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-on-now-ms-repeat' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clock-throws-on-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clock-throws-on-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-throws-on-advance' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hookError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['hookError'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('counter-throws-on-now-ms' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('metered-clock-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtime': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['hrtime'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterOptions': VirtualTimeCounterOptionsNode
          },
          ['advanceMs', 'counterOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('metered-clock-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('offset-provider-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('offset-provider-offset' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'now': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['now'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode,
            'virtualMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['counterOptions', 'virtualMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('traced-virtual-provider-now' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hrtime': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['hrtime'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'counterOptions': VirtualTimeCounterOptionsNode,
            'virtualMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['counterOptions', 'virtualMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('traced-virtual-provider-hrtime' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'precise': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['precise'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'rawMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'realProviderOptions': RealTimeClockProviderOptionsNode
          },
          ['rawMs', 'realProviderOptions'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('long-uptime-precision' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
