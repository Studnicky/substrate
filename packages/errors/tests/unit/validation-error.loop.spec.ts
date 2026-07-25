import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import scenarioGroups from './validation-error.scenarios.json';

type ScenarioInput = {
  correlationId?: string;
  message: string;
  path: string;
  violations?: ReadonlyArray<Record<string, unknown>>;
};

type ScenarioCase =
  | {
      description: string;
      expected: Record<string, unknown>;
      input: ScenarioInput;
      kind: 'code' | 'correlation-id' | 'detach-violations' | 'instanceof' | 'json-excludes-violations' | 'json-includes-violations' | 'json-roundtrip' | 'json-serializes' | 'message-with-path' | 'retryable' | 'user-message-empty-violations' | 'user-message-plain' | 'user-message-violations' | 'violations-absent' | 'violations-present' | 'violations-present-details' | 'violations-complex-details';
      name: string;
    };

type ScenarioRunner = (scenario: ScenarioCase, err: ValidationError) => void;

function materializeViolations(violations: ReadonlyArray<Record<string, unknown>> | undefined): ReadonlyArray<Record<string, unknown>> | undefined {
  if (violations === undefined) {
    return undefined;
  }
  return violations.map((violation) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(violation)) {
      if (key === 'details' && value !== null && typeof value === 'object') {
        result.details = { ...(value as Record<string, unknown>) };
      } else {
        result[key] = value;
      }
    }
    return result;
  });
}

function buildInput(input: ScenarioInput): { correlationId?: string; message: string; path: string; violations?: ReadonlyArray<Record<string, unknown>> } {
  return {
    'correlationId': input.correlationId,
    'message': input.message,
    'path': input.path,
    'violations': materializeViolations(input.violations)
  };
}

const runnerMap = {
  'code': (scenario, err) => {
    assert.strictEqual(err.code, scenario.expected.code);
  },
  'correlation-id': (scenario, err) => {
    assert.strictEqual(err.correlationId, scenario.expected.correlationId);
  },
  'detach-violations': (scenario) => {
    const violations = buildInput(scenario.input).violations;
    assert.ok(violations !== undefined);
    const detached = ValidationError.create(buildInput(scenario.input));
    (violations[0] as Record<string, unknown>).details = { 'limit': 4 };
    assert.deepStrictEqual(detached.violations, scenario.expected.violations);
    const projection = detached.violations?.[0];
    if (projection?.details !== undefined) {
      Reflect.set(projection.details, 'limit', 5);
    }
    assert.deepStrictEqual(detached.violations, scenario.expected.violations);
  },
  'instanceof': (_scenario, err) => {
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseError);
    assert.ok(err instanceof ValidationError);
  },
  'json-excludes-violations': (scenario, err) => {
    const json = err.toJSON() as Record<string, unknown>;
    assert.strictEqual('violations' in json, scenario.expected.hasViolations);
  },
  'json-includes-violations': (scenario, err) => {
    const json = err.toJSON() as Record<string, unknown>;
    assert.strictEqual('violations' in json, scenario.expected.hasViolations);
  },
  'json-roundtrip': (scenario, err) => {
    const parsed = JSON.parse(JSON.stringify(err.toJSON())) as Record<string, unknown>;
    assert.strictEqual(parsed.code, scenario.expected.code);
  },
  'json-serializes': (scenario, err) => {
    const json = err.toJSON() as Record<string, unknown>;
    assert.strictEqual(json.code, scenario.expected.code);
    assert.strictEqual(typeof json.message, scenario.expected.messageType);
  },
  'message-with-path': (scenario, err) => {
    for (const fragment of scenario.expected.messageIncludes as string[]) {
      assert.ok(err.message.includes(fragment));
    }
  },
  'retryable': (scenario, err) => {
    assert.strictEqual(err.retryable, scenario.expected.retryable);
  },
  'user-message-empty-violations': (scenario, err) => {
    assert.strictEqual(err.toUserMessage(), scenario.expected.message);
  },
  'user-message-plain': (scenario, err) => {
    assert.strictEqual(err.toUserMessage(), scenario.expected.message);
  },
  'user-message-violations': (scenario, err) => {
    const msg = err.toUserMessage();
    for (const fragment of scenario.expected.messageIncludes as string[]) {
      assert.ok(msg.includes(fragment));
    }
  },
  'violations-absent': (scenario, err) => {
    assert.deepStrictEqual(err.violations ?? { 'kind': 'undefined' }, scenario.expected.violations);
  },
  'violations-complex-details': (scenario) => {
    class DetailMarker {
      public readonly label = 'marker';
    }
    const marker = new DetailMarker();
    const details = (scenario.input.violations?.[0]?.details ?? {}) as Record<string, unknown>;
    const errWithComplexDetails = ValidationError.create({
      'message': scenario.input.message,
      'path': scenario.input.path,
      'violations': [
        {
          'details': {
            'instance': marker,
            'plain': details.plain,
            'tags': details.tags
          },
          'message': 'too long',
          'path': '/b'
        }
      ]
    });
    const violation = errWithComplexDetails.violations?.[0];
    assert.ok(violation !== undefined);
    assert.strictEqual(violation.details?.tags?.[0], scenario.expected.tags?.[0]);
    assert.strictEqual(violation.details?.plain?.nested?.count, scenario.expected.count);
    assert.strictEqual(violation.details?.instance, marker);
  },
  'violations-present': (scenario, err) => {
    assert.strictEqual(err.violations?.length, scenario.expected.violationsLength);
  },
  'violations-present-details': (scenario, err) => {
    assert.strictEqual(err.violations?.[0]?.details?.limit, scenario.expected.violationsLimit);
  }
} satisfies Record<ScenarioCase['kind'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  const err = ValidationError.create(buildInput(scenario.input));
  runnerMap[scenario.kind](scenario, err);
}

void describe('ValidationError', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
