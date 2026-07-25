import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';

import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { Retry } from '../../../src/retry/index.js';
import scenarioGroups from './hook-invocation-error.scenarios.json';

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: RetryScenarioInput; shape: 'async-rejects-are-guarded' | 'enter-call-swallows' | 'hookinvoker-default-throws'; name: string };

type RetryScenarioInput = Record<string, unknown> & {
  retry?: Partial<Pick<RetryConfigInterface, 'maxRetries'>>;
};

type ScenarioRunner = (scenario: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'async-rejects-are-guarded': async (scenario) => {
    const { expected, input } = scenario;
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    class RejectingEnterCallRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override async enterCall(
        _to: RetryCallStateEntity.Type,
        _from: RetryCallStateEntity.Type
      ): Promise<void> {
        await Promise.resolve();
        throw new Error(String(input.message));
      }
    }

    try {
      const retry = new RejectingEnterCallRetry(input.retry ?? {});
      const result = await retry.execute(async () => String(input.result));

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.strictEqual(result, String(expected.result));
      assert.strictEqual(unhandledRejections.length, Number(expected.unhandledRejections));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'enter-call-swallows': async (scenario) => {
    const { expected, input } = scenario;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config?: Partial<RetryConfigInterface>) {
        super(config ?? {});
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw new Error(String(input.message));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry ?? {});
    const result = await retry.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.result));
  },
  'hookinvoker-default-throws': async (scenario) => {
    const { expected, input } = scenario;
    const invoker = new HookInvoker();
    await assert.rejects(async () => invoker.invoke(String(input.hookName), () => { throw new Error(String(input.message)); }), (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.name, String(expected.errorShape));
      assert.strictEqual(error.hookName, String(expected.hookName));
      assert.strictEqual((error.cause as Error).message, String(expected.causeMessage));
      return true;
    });
  }
};

async function runCase(scenario: ScenarioCase): Promise<void> {
  await runnerMap[scenario.shape](scenario);
}

void describe('Retry hook invocation errors', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
