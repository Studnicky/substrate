import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class RetrySupportScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'classifierCalls': { 'minimum': 0, 'type': 'number' },
            'delay': { 'type': 'number' },
            'distinctResultsGreaterThan': { 'minimum': 0, 'type': 'number' },
            'invalid': { 'type': 'boolean' },
            'maximumDelay': { 'type': 'number' },
            'minimumDelay': { 'type': 'number' },
            'overrideDelays': { 'items': { 'type': 'number' }, 'type': 'array' },
            'recordedDelays': { 'items': { 'type': 'number' }, 'type': 'array' },
            'result': { 'type': 'boolean' },
            'valid': { 'type': 'boolean' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'attempt': { 'minimum': 0, 'type': 'number' },
            'baseDelay': { 'minimum': 0, 'type': 'number' },
            'batch': {
              'additionalProperties': false,
              'properties': {
                'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' },
                'sampleCount': { 'minimum': 1, 'type': 'number' }
              },
              'required': [],
              'type': 'object'
            },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'retry': {},
            'value': {}
          },
          'required': [],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static node<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'classifierCalls': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'delay': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'distinctResultsGreaterThan': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'invalid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'maximumDelay': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'minimumDelay': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'overrideDelays': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'recordedDelays': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'attempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'baseDelay': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'sampleCount': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': SchemaNode.defineUnknown({} as const),
        'value': SchemaNode.defineUnknown({} as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The scenario case shape `retry-support.loop.spec.ts` exercises. `retry` and `value` stay
 * `unknown`: several shapes deliberately feed malformed configuration/entity data to prove
 * the runtime guard rejects it, so their content cannot be schema-constrained here.
 */
export namespace RetrySupportScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      RetrySupportScenarioBranches.schema('backoff-config-default'),
      RetrySupportScenarioBranches.schema('backoff-config-exponential'),
      RetrySupportScenarioBranches.schema('backoff-config-override'),
      RetrySupportScenarioBranches.schema('backoff-strategy-bad-delay'),
      RetrySupportScenarioBranches.schema('backoff-strategy-missing-fn'),
      RetrySupportScenarioBranches.schema('backoff-strategy-non-object'),
      RetrySupportScenarioBranches.schema('config-guard-bad-type'),
      RetrySupportScenarioBranches.schema('config-guard-unknown-key'),
      RetrySupportScenarioBranches.schema('config-guard-valid'),
      RetrySupportScenarioBranches.schema('decorrelated-jitter-0'),
      RetrySupportScenarioBranches.schema('decorrelated-jitter-lower-bound'),
      RetrySupportScenarioBranches.schema('decorrelated-jitter-upper-bound'),
      RetrySupportScenarioBranches.schema('decorrelated-jitter-varying'),
      RetrySupportScenarioBranches.schema('entity-backoff-config'),
      RetrySupportScenarioBranches.schema('entity-retry-context')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    RetrySupportScenarioBranches.node('backoff-config-default'),
    RetrySupportScenarioBranches.node('backoff-config-exponential'),
    RetrySupportScenarioBranches.node('backoff-config-override'),
    RetrySupportScenarioBranches.node('backoff-strategy-bad-delay'),
    RetrySupportScenarioBranches.node('backoff-strategy-missing-fn'),
    RetrySupportScenarioBranches.node('backoff-strategy-non-object'),
    RetrySupportScenarioBranches.node('config-guard-bad-type'),
    RetrySupportScenarioBranches.node('config-guard-unknown-key'),
    RetrySupportScenarioBranches.node('config-guard-valid'),
    RetrySupportScenarioBranches.node('decorrelated-jitter-0'),
    RetrySupportScenarioBranches.node('decorrelated-jitter-lower-bound'),
    RetrySupportScenarioBranches.node('decorrelated-jitter-upper-bound'),
    RetrySupportScenarioBranches.node('decorrelated-jitter-varying'),
    RetrySupportScenarioBranches.node('entity-backoff-config'),
    RetrySupportScenarioBranches.node('entity-retry-context')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
