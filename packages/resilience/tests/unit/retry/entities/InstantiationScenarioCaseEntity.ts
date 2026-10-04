import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const retrySchema = {
  'additionalProperties': false,
  'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
  'required': [],
  'type': 'object'
};

const retryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class InstantiationScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'attempts': { 'minimum': 0, 'type': 'number' },
            'badType': { 'minLength': 1, 'type': 'string' },
            'causeMessage': { 'minLength': 1, 'type': 'string' },
            'detailMessage': { 'minLength': 1, 'type': 'string' },
            'errorCount': { 'minimum': 0, 'type': 'number' },
            'errorName': { 'minLength': 1, 'type': 'string' },
            'fallbackMessage': { 'minLength': 1, 'type': 'string' },
            'innerMessage': { 'minLength': 1, 'type': 'string' },
            'instanceOf': { 'minLength': 1, 'type': 'string' },
            'outerMessage': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'results': { 'items': { 'type': 'string' }, 'type': 'array' },
            'sourceMessage': { 'minLength': 1, 'type': 'string' },
            'tag': { 'minLength': 1, 'type': 'string' },
            'totalRetries': { 'minimum': 0, 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'appendedMessage': { 'minLength': 1, 'type': 'string' },
            'attempt': { 'minimum': 0, 'type': 'number' },
            'attemptNumber': { 'minimum': 0, 'type': 'number' },
            'batch': {
              'additionalProperties': false,
              'properties': { 'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' } },
              'required': [],
              'type': 'object'
            },
            'detailMessage': { 'minLength': 1, 'type': 'string' },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'errorName': { 'minLength': 1, 'type': 'string' },
            'exhaustedMessage': { 'minLength': 1, 'type': 'string' },
            'failedMessage': { 'minLength': 1, 'type': 'string' },
            'fallbackMessage': { 'minLength': 1, 'type': 'string' },
            'fatalReason': { 'minLength': 1, 'type': 'string' },
            'innerMessage': { 'minLength': 1, 'type': 'string' },
            'instanceOf': { 'minLength': 1, 'type': 'string' },
            'invalidError': { 'minLength': 1, 'type': 'string' },
            'laterMessage': { 'minLength': 1, 'type': 'string' },
            'mutatedAttempt': { 'minimum': 0, 'type': 'number' },
            'mutatedCauseMessage': { 'minLength': 1, 'type': 'string' },
            'mutatedHistoryMessage': { 'minLength': 1, 'type': 'string' },
            'mutatedInnerMessage': { 'minLength': 1, 'type': 'string' },
            'mutatedOuterMessage': { 'minLength': 1, 'type': 'string' },
            'outerMessage': { 'minLength': 1, 'type': 'string' },
            'recovered': { 'minLength': 1, 'type': 'string' },
            'rejectedMessage': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'retries': { 'minimum': 0, 'type': 'number' },
            'retry': retrySchema,
            'sourceMessage': { 'minLength': 1, 'type': 'string' },
            'tag': { 'minLength': 1, 'type': 'string' }
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
        'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'badType': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'causeMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'detailMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'errorCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'fallbackMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'innerMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'instanceOf': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'outerMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'sourceMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'tag': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'appendedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'attempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'attemptNumber': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'detailMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'exhaustedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'failedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'fallbackMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'fatalReason': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'innerMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'instanceOf': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'invalidError': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'laterMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'mutatedAttempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'mutatedCauseMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'mutatedHistoryMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'mutatedInnerMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'mutatedOuterMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'outerMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'recovered': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'retry': retryNode,
        'sourceMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'tag': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `instantiation.loop.spec.ts` exercises across `Retry.create`/`RetryError`/`MaximumRetriesExceededError`/`NonRetryableError`. */
export namespace InstantiationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      InstantiationScenarioBranches.schema('create-defaults'),
      InstantiationScenarioBranches.schema('create-error-classifier-and-max-retries'),
      InstantiationScenarioBranches.schema('create-max-retries-5'),
      InstantiationScenarioBranches.schema('derived-errors-expose-detached-diagnostics'),
      InstantiationScenarioBranches.schema('execute-retries-until-success'),
      InstantiationScenarioBranches.schema('factory-equivalent'),
      InstantiationScenarioBranches.schema('max-retries-empty-errors-fallback'),
      InstantiationScenarioBranches.schema('non-retryable-original-error-fallback'),
      InstantiationScenarioBranches.schema('retry-error-empty'),
      InstantiationScenarioBranches.schema('retry-error-preserves-error-name'),
      InstantiationScenarioBranches.schema('retry-error-preserves-history-error-name'),
      InstantiationScenarioBranches.schema('retry-error-projections-are-detached'),
      InstantiationScenarioBranches.schema('retry-error-rejects-non-error-diagnostics'),
      InstantiationScenarioBranches.schema('retry-error-snapshot-clone-fallback'),
      InstantiationScenarioBranches.schema('retry-error-snapshot-cycles'),
      InstantiationScenarioBranches.schema('retry-error-snapshots')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    InstantiationScenarioBranches.node('create-defaults'),
    InstantiationScenarioBranches.node('create-error-classifier-and-max-retries'),
    InstantiationScenarioBranches.node('create-max-retries-5'),
    InstantiationScenarioBranches.node('derived-errors-expose-detached-diagnostics'),
    InstantiationScenarioBranches.node('execute-retries-until-success'),
    InstantiationScenarioBranches.node('factory-equivalent'),
    InstantiationScenarioBranches.node('max-retries-empty-errors-fallback'),
    InstantiationScenarioBranches.node('non-retryable-original-error-fallback'),
    InstantiationScenarioBranches.node('retry-error-empty'),
    InstantiationScenarioBranches.node('retry-error-preserves-error-name'),
    InstantiationScenarioBranches.node('retry-error-preserves-history-error-name'),
    InstantiationScenarioBranches.node('retry-error-projections-are-detached'),
    InstantiationScenarioBranches.node('retry-error-rejects-non-error-diagnostics'),
    InstantiationScenarioBranches.node('retry-error-snapshot-clone-fallback'),
    InstantiationScenarioBranches.node('retry-error-snapshot-cycles'),
    InstantiationScenarioBranches.node('retry-error-snapshots')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
