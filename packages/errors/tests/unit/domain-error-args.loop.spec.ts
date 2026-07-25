import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { DomainErrorArgs } from '../../src/errors/DomainErrorArgs.js';
import type { BaseErrorArgumentsInterface } from '../../src/interfaces/BaseErrorArgumentsInterface.js';
import type { DomainErrorOptionsInterface } from '../../src/interfaces/DomainErrorOptionsInterface.js';
import scenarioGroups from './domain-error-args.scenarios.json';

abstract class StubFileLockError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}

class StubFileLockTimeoutError extends StubFileLockError {
  readonly path!: string;
  readonly timeoutMs!: number;

  constructor(error: StubFileLockErrorInputInterface) {
    const fields = error.fields;
    super(DomainErrorArgs.build(fields, buildStubFileLockOptions(error)));
    Object.assign(this, fields);
  }
}

interface StubFileLockFieldsInterface extends Record<string, unknown> {
  path: string;
  timeoutMs: number;
}

interface StubFileLockOptionsInputInterface {
  causeMessage?: string;
  code: string;
  correlationId?: string;
  message?: string;
  messageTemplate?: 'file-lock-timeout';
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
  retryable?: boolean;
}

interface StubFileLockErrorInputInterface {
  fields: StubFileLockFieldsInterface;
  options: StubFileLockOptionsInputInterface;
}

interface ScenarioInputInterface {
  error: StubFileLockErrorInputInterface;
}

type ScenarioShape = 'assigns-fields' | 'forwards-code-retryable' | 'includes-optional-fields' | 'message-callback' | 'name-resolves' | 'omits-optional-fields' | 'preserves-instanceof' | 'same-fields-object';

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: ScenarioInputInterface; shape: ScenarioShape; name: string };

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function buildStubFileLockOptions(error: StubFileLockErrorInputInterface): DomainErrorOptionsInterface<StubFileLockFieldsInterface> {
  return {
    cause: error.options.causeMessage === undefined ? undefined : new Error(error.options.causeMessage),
    code: error.options.code,
    correlationId: error.options.correlationId,
    message: (fields) => error.options.message ?? buildStubFileLockMessage(error.options.messageTemplate, fields),
    metadata: error.options.metadata,
    retryable: error.options.retryable
  };
}

const messageTemplateMap = {
  'file-lock-timeout': (fields: Readonly<StubFileLockFieldsInterface>) => `Timed out acquiring lock on "${fields.path}" after ${String(fields.timeoutMs)}ms`
} satisfies Record<NonNullable<StubFileLockOptionsInputInterface['messageTemplate']>, (fields: Readonly<StubFileLockFieldsInterface>) => string>;

function buildStubFileLockMessage(template: StubFileLockOptionsInputInterface['messageTemplate'], fields: Readonly<StubFileLockFieldsInterface>): string {
  return template === undefined ? '' : messageTemplateMap[template](fields);
}

const runnerMap = {
  'assigns-fields': (scenario) => {
    const { expected, input } = scenario;
    const err = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(err.path, String(expected.path));
    assert.strictEqual(err.timeoutMs, Number(expected.timeoutMs));
  },
  'forwards-code-retryable': (scenario) => {
    const { expected, input } = scenario;
    const err = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(err.code, String(expected.code));
    assert.strictEqual(err.retryable, Boolean(expected.retryable));
  },
  'includes-optional-fields': (scenario) => {
    const { expected, input } = scenario;
    const options = buildStubFileLockOptions(input.error);
    const args = DomainErrorArgs.build(input.error.fields, options);
    assert.strictEqual(args.cause, options.cause);
    assert.strictEqual(args.correlationId, String(expected.correlationId));
    assert.strictEqual(args.retryable, Boolean(expected.retryable));
    assert.strictEqual(args.metadata?.attempt, (expected.metadata as { attempt: number }).attempt);
  },
  'message-callback': (scenario) => {
    const { expected, input } = scenario;
    const err = new StubFileLockTimeoutError(input.error);
    assert.strictEqual(err.message, String(expected.message));
  },
  'name-resolves': (scenario) => {
    const { expected, input } = scenario;
    assert.strictEqual(new StubFileLockTimeoutError(input.error).name, String(expected.name));
  },
  'omits-optional-fields': (scenario) => {
    const { expected, input } = scenario;
    const args = DomainErrorArgs.build(input.error.fields, buildStubFileLockOptions(input.error));
    assert.strictEqual('cause' in args, Boolean(expected.hasCause));
    assert.strictEqual('correlationId' in args, Boolean(expected.hasCorrelationId));
    assert.strictEqual('metadata' in args, Boolean(expected.hasMetadata));
    assert.strictEqual('retryable' in args, Boolean(expected.hasRetryable));
  },
  'preserves-instanceof': (scenario) => {
    const { expected, input } = scenario;
    const err = new StubFileLockTimeoutError(input.error);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseError);
    assert.ok(err instanceof StubFileLockError);
    assert.ok(err instanceof StubFileLockTimeoutError);
    assert.deepStrictEqual(expected.instanceOf, ['Error', 'BaseError', 'StubFileLockError', 'StubFileLockTimeoutError']);
  },
  'same-fields-object': (scenario) => {
    const { expected, input } = scenario;
    const fields = input.error.fields;
    let received: Readonly<typeof fields> | undefined;
    DomainErrorArgs.build(fields, {
      ...buildStubFileLockOptions(input.error),
      message: (f) => {
        received = f;
        return input.error.options.message ?? '';
      }
    });
    assert.strictEqual(received, fields);
    assert.strictEqual(Boolean(expected.sameObject), true);
  }
} satisfies Record<ScenarioShape, ScenarioRunner>;

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('DomainErrorArgs.build()', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
