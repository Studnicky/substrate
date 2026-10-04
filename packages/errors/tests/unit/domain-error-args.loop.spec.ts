import type { BaseErrorArgumentsInterface } from '@studnicky/types/browser';

import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { DomainErrorOptionsInterface } from '../../src/interfaces/DomainErrorOptionsInterface.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DomainErrorArgumentList } from '../../src/errors/DomainErrorArgumentList.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import scenarioGroups from './domain-error-args.scenarios.json' with { 'type': 'json' };
import { DomainErrorArgumentListScenarioCaseEntity } from './entities/DomainErrorArgumentListScenarioCaseEntity.js';

abstract class StubFileLockError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}

class StubFileLockOptions {
  static build(error: DomainErrorArgumentListScenarioCaseEntity.Type['input']['error']): DomainErrorOptionsInterface<DomainErrorArgumentListScenarioCaseEntity.Type['input']['error']['fields']> {
    const result = {
      'cause': error.options.causeMessage === undefined ? undefined : RuntimeError.create(error.options.causeMessage),
      'code': error.options.code,
      'correlationId': error.options.correlationId,
      'message': (fields: Readonly<DomainErrorArgumentListScenarioCaseEntity.Type['input']['error']['fields']>): string => {
        const message = error.options.message ?? StubFileLockOptions.describe(error.options.messageTemplate, fields);
        return message;
      },
      'metadata': error.options.metadata,
      'retryable': error.options.retryable
    };
    return result;
  }

  private static describe(template: string | undefined, fields: Readonly<DomainErrorArgumentListScenarioCaseEntity.Type['input']['error']['fields']>): string {
    const result = template === 'file-lock-timeout'
      ? `Timed out acquiring lock on "${fields.path}" after ${String(fields.timeoutMs)}ms`
      : '';
    return result;
  }
}

class StubFileLockTimeoutError extends StubFileLockError {
  public override readonly name: string = 'StubFileLockTimeoutError';

  readonly path: string;
  readonly timeoutMs: number;

  constructor(error: DomainErrorArgumentListScenarioCaseEntity.Type['input']['error']) {
    super(DomainErrorArgumentList.build(error.fields, StubFileLockOptions.build(error)));
    this.path = error.fields.path;
    this.timeoutMs = error.fields.timeoutMs;
  }
}

class DomainErrorArgumentListRunners {
  static 'assigns-fields'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'assigns-fields'>): void {
    const { expected, input } = scenarioCase;
    const error = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(error.path, String(expected.path));
    assert.strictEqual(error.timeoutMs, Number(expected.timeoutMs));
  }

  static 'forwards-code-retryable'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'forwards-code-retryable'>): void {
    const { expected, input } = scenarioCase;
    const error = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(error.code, String(expected.code));
    assert.strictEqual(error.retryable, Boolean(expected.retryable));
  }

  static 'includes-optional-fields'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'includes-optional-fields'>): void {
    const { expected, input } = scenarioCase;
    const options = StubFileLockOptions.build(input.error);
    const argumentList = DomainErrorArgumentList.build(input.error.fields, options);
    assert.strictEqual(argumentList.cause, options.cause);
    assert.strictEqual(argumentList.correlationId, String(expected.correlationId));
    assert.strictEqual(argumentList.retryable, Boolean(expected.retryable));
    assert.strictEqual(argumentList.metadata?.attempt, expected.metadata?.attempt);
  }

  static 'message-callback'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'message-callback'>): void {
    const { expected, input } = scenarioCase;
    const error = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(error.message, String(expected.message));
  }

  static 'name-resolves'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'name-resolves'>): void {
    const { expected, input } = scenarioCase;
    assert.strictEqual(new StubFileLockTimeoutError(input.error).name, String(expected.name));
  }

  static 'omits-optional-fields'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'omits-optional-fields'>): void {
    const { expected, input } = scenarioCase;
    const argumentList = DomainErrorArgumentList.build(input.error.fields, StubFileLockOptions.build(input.error));
    assert.strictEqual('cause' in argumentList, Boolean(expected.hasCause));
    assert.strictEqual('correlationId' in argumentList, Boolean(expected.hasCorrelationId));
    assert.strictEqual('metadata' in argumentList, Boolean(expected.hasMetadata));
    assert.strictEqual('retryable' in argumentList, Boolean(expected.hasRetryable));
  }

  static 'preserves-instanceof'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'preserves-instanceof'>): void {
    const { input } = scenarioCase;
    const error = new StubFileLockTimeoutError(input.error);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof BaseError);
    assert.ok(error instanceof StubFileLockError);
    assert.ok(error instanceof StubFileLockTimeoutError);
  }

  static 'same-fields-object'(scenarioCase: ScenarioCaseOfType<DomainErrorArgumentListScenarioCaseEntity.Type, 'same-fields-object'>): void {
    const { input } = scenarioCase;
    const fields = input.error.fields;
    let received: Readonly<typeof fields> | undefined;
    DomainErrorArgumentList.build(fields, {
      ...StubFileLockOptions.build(input.error),
      'message': (receivedFields) => {
        received = receivedFields;
        const message = input.error.options.message ?? '';
        return message;
      }
    });
    assert.strictEqual(received, fields);
  }
}

ScenarioSuite.register({
  'entity': DomainErrorArgumentListScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'DomainErrorArgumentList.build()',
  'runners': DomainErrorArgumentListRunners
});
