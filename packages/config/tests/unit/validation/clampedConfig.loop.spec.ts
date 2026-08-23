import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ClampEventEntity } from '../../../src/entities/ClampEventEntity.js';
import type { ClampRuleEntity } from '../../../src/entities/ClampRuleEntity.js';
import { ClampedConfig } from '../../../src/validation/clampedConfig.js';
import scenarioGroups from './clampedConfig.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'absent-field-untouched'
  | 'async-throwing-hook-is-contained'
  | 'clamp-above-max'
  | 'clamp-below-min'
  | 'default-hook-noop'
  | 'in-range-untouched'
  | 'non-numeric-field-untouched'
  | 'on-clamp-fires'
  | 'on-clamp-multi-field'
  | 'on-clamp-skipped-in-range'
  | 'returns-new-object'
  | 'throwing-hook-preserves-input'
  | 'throwing-hook-preserves-result'
  | 'unruled-field-untouched';

type ClampInput = {
  readonly config: Record<string, unknown>;
  readonly rules: Readonly<Record<string, ClampRuleEntity.Type>>;
};

type ScenarioExpected = {
  readonly event?: ClampEventEntity.Type;
  readonly eventCount?: number;
  readonly eventFields?: readonly string[];
  readonly hookInvoked?: boolean;
  readonly input?: Record<string, unknown>;
  readonly rejectionCount?: number;
  readonly result: Record<string, unknown>;
  readonly sameRef?: boolean;
};

type ScenarioCase = {
  readonly description: string;
  readonly expected: ScenarioExpected;
  readonly input: ClampInput;
  readonly shape: ScenarioShape;
  readonly name: string;
};

type CapturedClampResult = {
  readonly events: readonly ClampEventEntity.Type[];
  readonly result: Record<string, unknown>;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const typedScenarioGroups = scenarioGroups as { readonly cases: readonly ScenarioCase[] };

function applyClamp<T extends Record<string, unknown>>(
  config: T,
  rules: Readonly<Record<string, ClampRuleEntity.Type>>
): T {
  return ClampedConfig.apply(config, rules);
}

function requiredRecord(value: Record<string, unknown> | undefined, label: string): Record<string, unknown> {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredBoolean(value: boolean | undefined, label: string): boolean {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredNumber(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredStrings(value: readonly string[] | undefined, label: string): readonly string[] {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredEvent(value: ClampEventEntity.Type | undefined, label: string): ClampEventEntity.Type {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function captureClampEvents(scenarioCase: ScenarioCase): CapturedClampResult {
  const events: ClampEventEntity.Type[] = [];
  class ObservingClampedConfig extends ClampedConfig {
    protected static override onClamp(event: ClampEventEntity.Type): void {
      events.push(event);
    }
  }

  return {
    'events': events,
    'result': ObservingClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules)
  };
}

function applyWithThrowingHook(scenarioCase: ScenarioCase): Record<string, unknown> {
  class ThrowingClampedConfig extends ClampedConfig {
    protected static override onClamp(): void {
      throw new Error('onClamp boom');
    }
  }

  return ThrowingClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function assertClampedResult(scenarioCase: ScenarioCase): void {
  assert.deepStrictEqual(applyClamp(scenarioCase.input.config, scenarioCase.input.rules), scenarioCase.expected.result);
}

const scenarioRunners: Record<ScenarioShape, ScenarioRunner> = {
  'absent-field-untouched': assertClampedResult,
  'async-throwing-hook-is-contained': async (scenarioCase): Promise<void> => {
    let hookInvoked = false;
    class AsyncOverrideClampedConfig extends ClampedConfig {
      protected static override async onClamp(_event: ClampEventEntity.Type): Promise<void> {
        hookInvoked = true;
        throw new Error('async onClamp boom');
      }
    }

    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (): void => {
      rejectionEvents.push(new Error('unexpected unhandled rejection'));
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const result = AsyncOverrideClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules);
      assert.deepStrictEqual(result, scenarioCase.expected.result);
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.strictEqual(hookInvoked, requiredBoolean(scenarioCase.expected.hookInvoked, 'expected.hookInvoked'));
      assert.strictEqual(rejectionEvents.length, requiredNumber(scenarioCase.expected.rejectionCount, 'expected.rejectionCount'));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'clamp-above-max': assertClampedResult,
  'clamp-below-min': assertClampedResult,
  'default-hook-noop': (scenarioCase): void => {
    assert.doesNotThrow(() => {
      assert.deepStrictEqual(applyClamp(scenarioCase.input.config, scenarioCase.input.rules), scenarioCase.expected.result);
    });
  },
  'in-range-untouched': assertClampedResult,
  'non-numeric-field-untouched': assertClampedResult,
  'on-clamp-fires': (scenarioCase): void => {
    const captured = captureClampEvents(scenarioCase);

    assert.deepStrictEqual(captured.events, [requiredEvent(scenarioCase.expected.event, 'expected.event')]);
    assert.deepStrictEqual(captured.result, scenarioCase.expected.result);
  },
  'on-clamp-multi-field': (scenarioCase): void => {
    const captured = captureClampEvents(scenarioCase);

    assert.deepStrictEqual(captured.result, scenarioCase.expected.result);
    assert.deepStrictEqual(
      sorted(captured.events.map((event) => event.field)),
      sorted(requiredStrings(scenarioCase.expected.eventFields, 'expected.eventFields'))
    );
  },
  'on-clamp-skipped-in-range': (scenarioCase): void => {
    const captured = captureClampEvents(scenarioCase);

    assert.strictEqual(captured.events.length, requiredNumber(scenarioCase.expected.eventCount, 'expected.eventCount'));
    assert.deepStrictEqual(captured.result, scenarioCase.expected.result);
  },
  'returns-new-object': (scenarioCase): void => {
    const result = applyClamp(scenarioCase.input.config, scenarioCase.input.rules);

    assert.strictEqual(result === scenarioCase.input.config, requiredBoolean(scenarioCase.expected.sameRef, 'expected.sameRef'));
    assert.deepStrictEqual(scenarioCase.input.config, requiredRecord(scenarioCase.expected.input, 'expected.input'));
    assert.deepStrictEqual(result, scenarioCase.expected.result);
  },
  'throwing-hook-preserves-input': (scenarioCase): void => {
    const result = applyWithThrowingHook(scenarioCase);

    assert.deepStrictEqual(result, scenarioCase.expected.result);
    assert.deepStrictEqual(scenarioCase.input.config, requiredRecord(scenarioCase.expected.input, 'expected.input'));
  },
  'throwing-hook-preserves-result': (scenarioCase): void => {
    assert.deepStrictEqual(applyWithThrowingHook(scenarioCase), scenarioCase.expected.result);
  },
  'unruled-field-untouched': assertClampedResult
};

void describe('ClampedConfig', () => {
  for (const scenario of typedScenarioGroups.cases) {
    void it(scenario.name, async () => {
      await scenarioRunners[scenario.shape](scenario);
    });
  }
});
