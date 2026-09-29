import { BaseError, CAUSE_DEPTH_SENTINEL, PROBLEM_TYPE_BASE, PROBLEM_TYPE_THROWN_STRING } from '@studnicky/types/browser';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONSchema7Type } from 'json-schema';

import { Predicates } from '@studnicky/types/node';

import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { BaseErrorScenarioCaseEntity } from './entities/BaseErrorScenarioCaseEntity.js';
import scenarioGroups from './base-error.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(BaseErrorScenarioCaseEntity.Schema, BaseErrorScenarioCaseEntity.Node, BaseErrorScenarioCaseEntity.RemoteSchemas);

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw RuntimeError.create(`${label} must be a string`);
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(`${label} must be a number`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw RuntimeError.create(`${label} must be a string array`);
  }
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!Predicates.isRecord(value)) {
    throw RuntimeError.create(`${label} must be an object`);
  }
  return value;
}

class TestError extends BaseError {
  public override readonly name: string = 'TestError';

  public constructor(message: string, options?: Partial<{
    cause: unknown;
    code: string;
    correlationId: string;
    metadata: Record<string, JSONSchema7Type>;
    retryable: boolean;
  }>) {
    super({
      cause: options?.cause,
      code: options?.code ?? 'test.generic',
      correlationId: options?.correlationId,
      message,
      ...(options?.metadata === undefined ? {} : { metadata: options.metadata }),
      retryable: options?.retryable ?? false
    });
  }
}

class OmittedOptionalArgsError extends BaseError {
  public override readonly name: string = 'OmittedOptionalArgsError';

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

type ScenarioCase = BaseErrorScenarioCaseEntity.Type;
type CauseDescriptor = Extract<NonNullable<ScenarioCase['input']['cause']>, { shape: string }>;
type ToMessageInput = NonNullable<ScenarioCase['input']['toMessage']>;

type ScenarioRunner = (scenario: ScenarioCase, error: TestError) => void;

const causeFactoryMap = {
  'base-error': (cause: CauseDescriptor) => new TestError(cause.message),
  'native-error': (cause: CauseDescriptor) => RuntimeError.create(cause.message)
} satisfies Record<CauseDescriptor['shape'], (cause: CauseDescriptor) => unknown>;

const toMessageInputMap = {
  'native-error': (input: ToMessageInput) => RuntimeError.create(String(input.message)),
  'primitive': (input: ToMessageInput) => input.value
} satisfies Record<ToMessageInput['shape'], (input: ToMessageInput) => unknown>;

function isCauseDescriptor(cause: CauseDescriptor | string | undefined): cause is CauseDescriptor {
  return cause !== undefined && typeof cause !== 'string';
}

function createCause(cause: CauseDescriptor | string | undefined): unknown {
  return isCauseDescriptor(cause) ? causeFactoryMap[cause.shape](cause) : cause;
}

function createToMessageInput(input: ToMessageInput | undefined): unknown {
  return input === undefined ? undefined : toMessageInputMap[input.shape](input);
}

function createError(input: ScenarioCase['input']): TestError {
  const options = {
    'cause': createCause(input.cause),
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable })
  };

  return new TestError(input.message, options);
}

const runnerMap = {
  'cause-chain': (scenario, error) => {
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, Number(scenario.expected.length));
    assert.deepStrictEqual(chain.map((entry) => entry instanceof Error ? entry.message : String(entry)), scenario.expected.messages);
  },
  'cause-chain-primitive': (scenario, error) => {
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, Number(scenario.expected.length));
    assert.deepStrictEqual(chain.map((entry) => entry instanceof Error ? entry.message : String(entry)), scenario.expected.messages);
  },
  'construction-cause': (scenario, error) => {
    const causeMessage = error.cause instanceof Error ? error.cause.message : undefined;
    assert.strictEqual(causeMessage, scenario.expected.causeMessage);
  },
  'construction-code': (scenario, error) => {
    assert.strictEqual(error.code, scenario.expected.code);
  },
  'construction-correlation-id': (scenario, error) => {
    assert.deepStrictEqual(error.correlationId ?? { 'shape': 'undefined' }, scenario.expected.correlationId ?? { 'shape': 'undefined' });
  },
  'construction-correlation-id-absent': (scenario, error) => {
    assert.deepStrictEqual(error.correlationId ?? { 'shape': 'undefined' }, scenario.expected.correlationId ?? { 'shape': 'undefined' });
  },
  'construction-default-retryable': (scenario, error) => {
    assert.strictEqual(error.retryable, scenario.expected.retryable);
  },
  'construction-explicit-retryable': (scenario, error) => {
    assert.strictEqual(error.retryable, scenario.expected.retryable);
  },
  'construction-instanceof': (scenario, error) => {
    assert.strictEqual(error instanceof Error, scenario.expected.instanceofError);
    assert.strictEqual(error instanceof BaseError, scenario.expected.instanceofBaseError);
  },
  'construction-message': (scenario, error) => {
    assert.strictEqual(error.message, scenario.expected.message);
  },
  'construction-metadata': (scenario, error) => {
    assert.deepStrictEqual(error.metadata, scenario.expected.metadata);
    assert.ok(Object.isFrozen(error.metadata));
  },
  'construction-metadata-absent': (_scenario, error) => {
    assert.strictEqual(error.metadata, undefined);
  },
  'construction-metadata-nested': (scenario, error) => {
    assert.deepStrictEqual(error.metadata, scenario.expected.metadata);
    assert.ok(Object.isFrozen(error.metadata));
    assert.deepStrictEqual(error.toJSON().context, scenario.expected.metadata);
  },
  'construction-name': (scenario, error) => {
    assert.strictEqual(error.name, scenario.expected.name);
  },
  'construction-omitted-optional-args': (scenario) => {
    const omitted = new OmittedOptionalArgsError(scenario.input.message);
    assert.strictEqual(omitted.retryable, scenario.expected.retryable);
    assert.strictEqual(omitted.correlationId, undefined);
    assert.strictEqual(omitted.metadata, undefined);
  },
  'construction-timestamp': (scenario) => {
    const before = Date.now();
    const observed = createError(scenario.input).timestamp;
    const after = Date.now();
    const timestampWithinMs = requireNumber(scenario.expected.timestampWithinMs, 'Scenario expected.timestampWithinMs');
    assert.ok(observed >= before - timestampWithinMs);
    assert.ok(observed <= after + timestampWithinMs);
  },
  'find-cause-of-type-hit': (scenario) => {
    class InnerError extends TestError {
      public override readonly name: string = 'InnerError';
    }
    const nested = new TestError('top', { cause: new InnerError(String(scenario.expected.causeMessage)) });
    const cause = BaseError.findCauseOfType(nested, InnerError);
    assert.ok(cause instanceof InnerError);
    assert.strictEqual(cause.message, scenario.expected.causeMessage);
  },
  'find-cause-of-type-miss': (_scenario, error) => {
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    const cause = BaseError.findCauseOfType(error, MissingError);
    assert.strictEqual(cause, undefined);
  },
  'find-cause-of-type-primitive': () => {
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    const primitiveError = createError({ 'message': 'top', 'cause': 'primitive cause' });
    const cause = BaseError.findCauseOfType(primitiveError, MissingError);
    assert.strictEqual(cause, undefined);
  },
  'find-cause-of-type-self': (scenario, error) => {
    const cause = BaseError.findCauseOfType(error, TestError);
    assert.strictEqual(cause === error, scenario.expected.sameInstance);
  },
  'has-cause-of-type-hit': (scenario, error) => {
    assert.strictEqual(BaseError.hasCauseOfType(error, Error), scenario.expected.value);
  },
  'has-cause-of-type-miss': (scenario, error) => {
    class MissingError extends TestError {
      public override readonly name: string = 'MissingError';
    }
    assert.strictEqual(BaseError.hasCauseOfType(error, MissingError), scenario.expected.value);
  },
  'json-code-message': (scenario, error) => {
    const json = error.toJSON();
    assert.strictEqual(json.code, scenario.expected.code);
    assert.strictEqual(json.detail, scenario.expected.message);
  },
  'json-correlation-absent': (_scenario, error) => {
    assert.ok(!('correlationId' in error.toJSON()));
  },
  'json-correlation-value': (scenario, error) => {
    assert.strictEqual(error.toJSON().correlationId, scenario.expected.correlationId);
  },
  'json-depth-sentinel': (scenario, error) => {
    let current: BaseError = error;
    for (let index = 1; index <= (scenario.input.depth ?? 0); index += 1) {
      current = new TestError(`depth-${index}`, { cause: current });
    }
    const causes = current.toJSON().causes ?? [];
    const found = causes.some((node) => {
      const result = node.detail === CAUSE_DEPTH_SENTINEL;
      return result;
    });
    assert.strictEqual(found, scenario.expected.hasDepthSentinel);
  },
  'json-native-error-cause': (scenario, error) => {
    const cause = (error.toJSON().causes ?? [])[0];
    const expectedCause = requireRecord(scenario.expected.cause, 'Scenario expected.cause');
    assert.strictEqual(cause?.code, 'errors.runtime');
    assert.strictEqual(cause?.detail, expectedCause.message);
  },
  'json-primitive-cause': (scenario, error) => {
    const cause = (error.toJSON().causes ?? [])[0];
    const expectedCause = requireRecord(scenario.expected.cause, 'Scenario expected.cause');
    assert.strictEqual(cause?.type, PROBLEM_TYPE_THROWN_STRING);
    assert.strictEqual(cause?.detail, expectedCause.message);
  },
  'json-recursive-cause': (_scenario, error) => {
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.code, 'test.generic');
    assert.strictEqual(causes[0]?.detail, 'root');
    assert.strictEqual(causes.length, 1);
  },
  'json-required-fields': (scenario, error) => {
    const json = error.toJSON();
    for (const key of requireStringArray(scenario.expected.containsFields, 'Scenario expected.containsFields')) {
      assert.ok(key in json);
    }
  },
  'json-roundtrip': (scenario, error) => {
    const roundtrip: unknown = JSON.parse(JSON.stringify(error.toJSON()));
    assert.ok(Predicates.isObject(roundtrip));
    assert.ok(ProblemDetailsEntity.validate(roundtrip));
    assert.strictEqual(roundtrip.detail, scenario.expected.message);
    assert.strictEqual(roundtrip.correlationId, scenario.expected.correlationId ?? undefined);
  },
  'to-message-native-error': (scenario) => {
    assert.strictEqual(BaseError.toMessage(createToMessageInput(scenario.input.toMessage)), scenario.expected.message);
  },
  'to-message-primitive': (scenario) => {
    assert.strictEqual(BaseError.toMessage(createToMessageInput(scenario.input.toMessage)), scenario.expected.message);
  },
  'to-problem-details': (scenario, error) => {
    const problem = error.toJSON();
    assert.strictEqual(problem.code, scenario.expected.code);
    assert.strictEqual(problem.detail, scenario.expected.message);
    assert.strictEqual(problem.correlationId, scenario.expected.correlationId ?? undefined);
    assert.strictEqual(problem.type, `${PROBLEM_TYPE_BASE}${requireString(scenario.expected.code, 'Scenario expected.code')}`);
    assert.strictEqual(problem.title, error.name);
  },
  'to-user-message-custom': (scenario) => {
    assert.strictEqual(new CustomMessageError(scenario.input.message).toUserMessage(), scenario.expected.message);
  },
  'to-user-message-default': (scenario, error) => {
    assert.strictEqual(error.toUserMessage(), scenario.expected.message);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.shape](scenario, createError(scenario.input));
}

void describe('BaseError', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      runCase(scenario);
    });
  }
});
