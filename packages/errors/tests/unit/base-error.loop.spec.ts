import type { JSONSchema7Type } from 'json-schema';

import { BaseError, CAUSE_DEPTH_SENTINEL, PROBLEM_TYPE_BASE, PROBLEM_TYPE_THROWN_STRING } from '@studnicky/types/browser';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import scenarioGroups from './base-error.scenarios.json' with { 'type': 'json' };
import { BaseErrorScenarioCaseEntity } from './entities/BaseErrorScenarioCaseEntity.js';


class TestError extends BaseError {
  public override readonly name: string = 'TestError';

  public constructor(message: string, options?: Partial<{
    'cause': unknown;
    'code': string;
    'correlationId': string;
    'metadata': Record<string, JSONSchema7Type>;
    'retryable': boolean;
  }>) {
    super({
      'cause': options?.cause,
      'code': options?.code ?? 'test.generic',
      'correlationId': options?.correlationId,
      'message': message,
      ...(options?.metadata === undefined ? {} : { 'metadata': options.metadata }),
      'retryable': options?.retryable ?? false
    });
  }
}

class OmittedOptionalArgumentListError extends BaseError {
  public override readonly name: string = 'OmittedOptionalArgumentListError';

  public constructor(message: string) {
    super({
      'code': 'test.omittedOptionalArgs',
      'message': message
    });
  }
}

class CustomMessageError extends BaseError {
  public override readonly name: string = 'CustomMessageError';

  public constructor(message: string) {
    super({
      'code': 'test.custom',
      'message': message,
      'retryable': false
    });
  }

  protected override formatUserMessage(): string {
    return `custom: ${this.message}`;
  }
}

class BaseErrorRunners {
  static 'cause-chain'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'cause-chain'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, Number(scenarioCase.expected.length));
    assert.deepStrictEqual(chain.map((entry) => {
      const message = entry instanceof Error ? entry.message : String(entry);
      return message;
    }), scenarioCase.expected.messages);
  }

  static 'cause-chain-primitive'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'cause-chain-primitive'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, Number(scenarioCase.expected.length));
    assert.deepStrictEqual(chain.map((entry) => {
      const message = entry instanceof Error ? entry.message : String(entry);
      return message;
    }), scenarioCase.expected.messages);
  }

  static 'construction-cause'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-cause'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const causeMessage = error.cause instanceof Error ? error.cause.message : undefined;
    assert.strictEqual(causeMessage, scenarioCase.expected.causeMessage);
  }

  static 'construction-code'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-code'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'construction-correlation-id'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-correlation-id'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.deepStrictEqual(error.correlationId ?? { 'shape': 'undefined' }, scenarioCase.expected.correlationId ?? { 'shape': 'undefined' });
  }

  static 'construction-correlation-id-absent'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-correlation-id-absent'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.deepStrictEqual(error.correlationId ?? { 'shape': 'undefined' }, scenarioCase.expected.correlationId ?? { 'shape': 'undefined' });
  }

  static 'construction-default-retryable'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-default-retryable'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  }

  static 'construction-explicit-retryable'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-explicit-retryable'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  }

  static 'construction-instanceof'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-instanceof'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error instanceof Error, scenarioCase.expected.instanceofError);
    assert.strictEqual(error instanceof BaseError, scenarioCase.expected.instanceofBaseError);
  }

  static 'construction-message'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-message'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.message, scenarioCase.expected.message);
  }

  static 'construction-metadata'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-metadata'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
    assert.ok(Object.isFrozen(error.metadata));
  }

  static 'construction-metadata-absent'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-metadata-absent'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.metadata, undefined);
  }

  static 'construction-metadata-nested'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-metadata-nested'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
    assert.ok(Object.isFrozen(error.metadata));
    assert.deepStrictEqual(error.toJSON().context, scenarioCase.expected.metadata);
  }

  static 'construction-name'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-name'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.name, scenarioCase.expected.name);
  }

  static 'construction-omitted-optional-args'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-omitted-optional-args'>): void {
    const omitted = new OmittedOptionalArgumentListError(scenarioCase.input.message);
    assert.strictEqual(omitted.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(omitted.correlationId, undefined);
    assert.strictEqual(omitted.metadata, undefined);
  }

  static 'construction-timestamp'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'construction-timestamp'>): void {
    const before = Date.now();
    const observed = BaseErrorRunners.createError(scenarioCase.input).timestamp;
    const after = Date.now();
    const timestampWithinMs = ScenarioValues.requireNumber(scenarioCase.expected.timestampWithinMs, 'Scenario expected.timestampWithinMs');
    assert.ok(observed >= before - timestampWithinMs);
    assert.ok(observed <= after + timestampWithinMs);
  }

  static 'find-cause-of-type-hit'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'find-cause-of-type-hit'>): void {
    class InnerError extends TestError {
      public override readonly name: string = 'InnerError';
    }
    const nested = new TestError('top', { 'cause': new InnerError(String(scenarioCase.expected.causeMessage)) });
    const cause = BaseError.findCauseOfType(nested, InnerError);
    assert.ok(cause instanceof InnerError);
    assert.strictEqual(cause.message, scenarioCase.expected.causeMessage);
  }

  static 'find-cause-of-type-miss'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'find-cause-of-type-miss'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    const cause = BaseError.findCauseOfType(error, MissingError);
    assert.strictEqual(cause, undefined);
  }

  static 'find-cause-of-type-primitive'(): void {
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    const primitiveError = BaseErrorRunners.createError({ 'cause': 'primitive cause', 'message': 'top' });
    const cause = BaseError.findCauseOfType(primitiveError, MissingError);
    assert.strictEqual(cause, undefined);
  }

  static 'find-cause-of-type-self'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'find-cause-of-type-self'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const cause = BaseError.findCauseOfType(error, TestError);
    assert.strictEqual(cause === error, scenarioCase.expected.sameInstance);
  }

  static 'has-cause-of-type-hit'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'has-cause-of-type-hit'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(BaseError.hasCauseOfType(error, Error), scenarioCase.expected.value);
  }

  static 'has-cause-of-type-miss'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'has-cause-of-type-miss'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    assert.strictEqual(BaseError.hasCauseOfType(error, MissingError), scenarioCase.expected.value);
  }

  static 'json-code-message'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-code-message'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const json = error.toJSON();
    assert.strictEqual(json.code, scenarioCase.expected.code);
    assert.strictEqual(json.detail, scenarioCase.expected.message);
  }

  static 'json-correlation-absent'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-correlation-absent'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.ok(!('correlationId' in error.toJSON()));
  }

  static 'json-correlation-value'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-correlation-value'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.toJSON().correlationId, scenarioCase.expected.correlationId);
  }

  static 'json-depth-sentinel'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-depth-sentinel'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    let current: BaseError = error;
    for (let index = 1; index <= (scenarioCase.input.depth ?? 0); index += 1) {
      current = new TestError(`depth-${index}`, { 'cause': current });
    }
    const causes = current.toJSON().causes ?? [];
    let found = false;
    for (let index = 0; index < causes.length; index += 1) {
      if (causes[index]?.detail === CAUSE_DEPTH_SENTINEL) {
        found = true;
        break;
      }
    }
    assert.strictEqual(found, scenarioCase.expected.hasDepthSentinel);
  }

  static 'json-native-error-cause'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-native-error-cause'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const cause = (error.toJSON().causes ?? [])[0];
    const expectedCause = ScenarioValues.requireRecord(scenarioCase.expected.cause, 'Scenario expected.cause');
    assert.strictEqual(cause?.code, 'errors.runtime');
    assert.strictEqual(cause?.detail, expectedCause.message);
  }

  static 'json-primitive-cause'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-primitive-cause'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const cause = (error.toJSON().causes ?? [])[0];
    const expectedCause = ScenarioValues.requireRecord(scenarioCase.expected.cause, 'Scenario expected.cause');
    assert.strictEqual(cause?.type, PROBLEM_TYPE_THROWN_STRING);
    assert.strictEqual(cause?.detail, expectedCause.message);
  }

  static 'json-recursive-cause'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-recursive-cause'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.code, 'test.generic');
    assert.strictEqual(causes[0]?.detail, 'root');
    assert.strictEqual(causes.length, 1);
  }

  static 'json-required-fields'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-required-fields'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const json = error.toJSON();
    const fields = ScenarioValues.requireStringArray(scenarioCase.expected.containsFields, 'Scenario expected.containsFields');
    for (let index = 0; index < fields.length; index += 1) {
      const key = ScenarioValues.requireString(fields[index], 'Scenario expected.containsFields[index]');
      assert.ok(key in json);
    }
  }

  static 'json-roundtrip'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'json-roundtrip'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    let roundtrip: unknown;
    try {
      roundtrip = JSON.parse(JSON.stringify(error.toJSON()));
    } catch (cause) {
      throw RuntimeError.create('JSON roundtrip failed', { 'cause': cause });
    }
    if (!Predicates.isObject(roundtrip)) {
      throw RuntimeError.create('roundtrip is not an object');
    }
    if (!ProblemDetailsEntity.validate(roundtrip)) {
      throw RuntimeError.create('roundtrip failed validation');
    }
    assert.strictEqual(roundtrip.detail, scenarioCase.expected.message);
    assert.strictEqual(roundtrip.correlationId, scenarioCase.expected.correlationId ?? undefined);
  }

  static 'to-message-native-error'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'to-message-native-error'>): void {
    assert.strictEqual(BaseError.toMessage(BaseErrorRunners.createToMessageInput(scenarioCase.input.toMessage)), scenarioCase.expected.message);
  }

  static 'to-message-primitive'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'to-message-primitive'>): void {
    assert.strictEqual(BaseError.toMessage(BaseErrorRunners.createToMessageInput(scenarioCase.input.toMessage)), scenarioCase.expected.message);
  }

  static 'to-problem-details'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'to-problem-details'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    const problem = error.toJSON();
    assert.strictEqual(problem.code, scenarioCase.expected.code);
    assert.strictEqual(problem.detail, scenarioCase.expected.message);
    assert.strictEqual(problem.correlationId, scenarioCase.expected.correlationId ?? undefined);
    assert.strictEqual(problem.type, `${PROBLEM_TYPE_BASE}${ScenarioValues.requireString(scenarioCase.expected.code, 'Scenario expected.code')}`);
    assert.strictEqual(problem.title, error.name);
  }

  static 'to-user-message-custom'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'to-user-message-custom'>): void {
    assert.strictEqual(new CustomMessageError(scenarioCase.input.message).toUserMessage(), scenarioCase.expected.message);
  }

  static 'to-user-message-default'(scenarioCase: ScenarioCaseOfType<BaseErrorScenarioCaseEntity.Type, 'to-user-message-default'>): void {
    const error = BaseErrorRunners.createError(scenarioCase.input);
    assert.strictEqual(error.toUserMessage(), scenarioCase.expected.message);
  }

  private static createCause(cause: BaseErrorScenarioCaseEntity.Type['input']['cause']): unknown {
    if (cause === undefined || typeof cause === 'string') {
      const result = cause;
      return result;
    }
    const result = cause.shape === 'base-error'
      ? new TestError(cause.message)
      : RuntimeError.create(cause.message);
    return result;
  }

  private static createToMessageInput(input: BaseErrorScenarioCaseEntity.Type['input']['toMessage']): unknown {
    if (input === undefined) {
      const result = undefined;
      return result;
    }
    const result = input.shape === 'native-error'
      ? RuntimeError.create(String(input.message))
      : input.value;
    return result;
  }

  private static createError(input: BaseErrorScenarioCaseEntity.Type['input']): TestError {
    const options = {
      'cause': BaseErrorRunners.createCause(input.cause),
      ...(input.correlationId === undefined ? {} : { 'correlationId': input.correlationId }),
      ...(input.metadata === undefined ? {} : { 'metadata': input.metadata }),
      ...(input.retryable === undefined ? {} : { 'retryable': input.retryable })
    };
    const result = new TestError(input.message, options);
    return result;
  }
}

ScenarioSuite.register({
  'entity': BaseErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BaseError',
  'runners': BaseErrorRunners
});
