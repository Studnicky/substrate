import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONSchema7Type } from 'json-schema';

import { Predicates } from '@studnicky/types';

import { CAUSE_DEPTH_SENTINEL } from '../../src/constants/CauseChainConstants.js';
import { BaseError } from '../../src/errors/BaseError.js';
import scenarioGroups from './base-error.scenarios.json' with { type: 'json' };

class TestError extends BaseError {
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
  public constructor(message: string) {
    super({
      'code': 'test.omittedOptionalArgs',
      'message': message
    });
  }
}

class CustomMessageError extends BaseError {
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

type CauseDescriptor = { shape: 'base-error' | 'native-error'; message: string };
type ScenarioInput = {
  cause?: CauseDescriptor | string;
  correlationId?: string;
  depth?: number;
  message: string;
  metadata?: Record<string, JSONSchema7Type>;
  retryable?: boolean;
  toMessage?: ToMessageInput;
};
type ToMessageInput = { shape: 'native-error' | 'primitive'; message?: string; value?: boolean | null | number | string };

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInput;
  shape: 'cause-chain' | 'cause-chain-primitive' | 'construction-cause' | 'construction-code' | 'construction-correlation-id' | 'construction-correlation-id-absent' | 'construction-default-retryable' | 'construction-explicit-retryable' | 'construction-instanceof' | 'construction-message' | 'construction-metadata' | 'construction-metadata-absent' | 'construction-metadata-nested' | 'construction-name' | 'construction-omitted-optional-args' | 'construction-timestamp' | 'find-cause-of-type-hit' | 'find-cause-of-type-miss' | 'find-cause-of-type-primitive' | 'find-cause-of-type-self' | 'has-cause-of-type-hit' | 'has-cause-of-type-miss' | 'json-code-message' | 'json-correlation-null' | 'json-correlation-value' | 'json-depth-sentinel' | 'json-native-error-cause' | 'json-primitive-cause' | 'json-recursive-cause' | 'json-required-fields' | 'json-roundtrip' | 'to-message-native-error' | 'to-message-primitive' | 'to-serialized-error' | 'to-user-message-default' | 'to-user-message-custom';
  name: string;
};

type ScenarioRunner = (scenario: ScenarioCase, error: TestError) => void;

const causeFactoryMap = {
  'base-error': (cause: CauseDescriptor) => new TestError(cause.message),
  'native-error': (cause: CauseDescriptor) => new Error(cause.message)
} satisfies Record<CauseDescriptor['shape'], (cause: CauseDescriptor) => unknown>;

const toMessageInputMap = {
  'native-error': (input: ToMessageInput) => new Error(String(input.message)),
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
    assert.strictEqual((error.cause as Error | undefined)?.message, scenario.expected.causeMessage);
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
    assert.ok(observed >= before - (scenario.expected.timestampWithinMs as number));
    assert.ok(observed <= after + (scenario.expected.timestampWithinMs as number));
  },
  'find-cause-of-type-hit': (scenario) => {
    class InnerError extends Error {}
    const nested = new TestError('top', { cause: new InnerError(String(scenario.expected.causeMessage)) });
    const cause = BaseError.findCauseOfType(nested, InnerError);
    assert.ok(cause instanceof InnerError);
    assert.strictEqual(cause.message, scenario.expected.causeMessage);
  },
  'find-cause-of-type-miss': (_scenario, error) => {
    class MissingError extends Error {}
    const cause = BaseError.findCauseOfType(error, MissingError);
    assert.strictEqual(cause, undefined);
  },
  'find-cause-of-type-primitive': () => {
    class MissingError extends Error {}
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
    class MissingError extends Error {}
    assert.strictEqual(BaseError.hasCauseOfType(error, MissingError), scenario.expected.value);
  },
  'json-code-message': (scenario, error) => {
    const json = error.toJSON();
    assert.strictEqual(json.code, scenario.expected.code);
    assert.strictEqual(json.message, scenario.expected.message);
  },
  'json-correlation-null': (_scenario, error) => {
    assert.strictEqual(error.toJSON().correlationId, null);
  },
  'json-correlation-value': (scenario, error) => {
    assert.strictEqual(error.toJSON().correlationId, scenario.expected.correlationId);
  },
  'json-depth-sentinel': (scenario, error) => {
    let current: BaseError = error;
    for (let index = 1; index <= (scenario.input.depth ?? 0); index += 1) {
      current = new TestError(`depth-${index}`, { cause: current });
    }
    let node: unknown = current.toJSON();
    let found = false;
    while (node !== null && node !== undefined) {
      if (!Predicates.isObject(node)) {
        break;
      }
      if (typeof node.cause === 'string' && node.cause === CAUSE_DEPTH_SENTINEL) {
        found = true;
        break;
      }
      node = node.cause;
    }
    assert.strictEqual(found, scenario.expected.hasDepthSentinel);
  },
  'json-native-error-cause': (scenario, error) => {
    const cause = error.toJSON().cause as Record<string, unknown>;
    assert.strictEqual(cause.code, 'native.error');
    assert.strictEqual(cause.message, (scenario.expected.cause as { message: string }).message);
  },
  'json-primitive-cause': (scenario, error) => {
    const cause = error.toJSON().cause as Record<string, unknown>;
    assert.strictEqual(cause.code, 'native.primitive');
    assert.strictEqual(cause.message, (scenario.expected.cause as { message: string }).message);
  },
  'json-recursive-cause': (_scenario, error) => {
    const cause = error.toJSON().cause as Record<string, unknown>;
    assert.strictEqual(cause.code, 'test.generic');
    assert.strictEqual(cause.message, 'root');
    assert.strictEqual(cause.cause, null);
  },
  'json-required-fields': (scenario, error) => {
    const json = error.toJSON();
    for (const key of scenario.expected.containsFields as string[]) {
      assert.ok(key in json);
    }
  },
  'json-roundtrip': (scenario, error) => {
    const roundtrip: unknown = JSON.parse(JSON.stringify(error.toJSON()));
    assert.ok(Predicates.isObject(roundtrip));
    const roundtripObject = roundtrip as Record<string, unknown>;
    assert.strictEqual(roundtripObject.message, scenario.expected.message);
    assert.strictEqual(roundtripObject.correlationId, scenario.expected.correlationId);
  },
  'to-message-native-error': (scenario) => {
    assert.strictEqual(BaseError.toMessage(createToMessageInput(scenario.input.toMessage)), scenario.expected.message);
  },
  'to-message-primitive': (scenario) => {
    assert.strictEqual(BaseError.toMessage(createToMessageInput(scenario.input.toMessage)), scenario.expected.message);
  },
  'to-serialized-error': (scenario, error) => {
    const serialized = error.toSerializedError();
    assert.strictEqual(serialized.code, scenario.expected.code);
    assert.strictEqual(serialized.message, scenario.expected.message);
    assert.strictEqual(serialized.correlationId, scenario.expected.correlationId);
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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      runCase(scenario);
    });
  }
});
