import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import scenarioGroups from './validation-error.scenarios.json' with { type: 'json' };

type RawScenarioCase = { description: string; expected: Record<string, unknown>; input: unknown; name: string; shape: string };

type ScenarioCase =
  | {
      description: string;
      expected: Record<string, unknown>;
      input: ValidationErrorArgumentsEntity.Type;
      shape: 'code' | 'correlation-id' | 'detach-violations' | 'instanceof' | 'json-excludes-violations' | 'json-includes-violations' | 'json-roundtrip' | 'json-serializes' | 'message-with-path' | 'retryable' | 'user-message-empty-violations' | 'user-message-plain' | 'user-message-violations' | 'violations-absent' | 'violations-present' | 'violations-present-details' | 'violations-complex-details';
      name: string;
    };

type ScenarioRunner = (scenario: ScenarioCase, err: ValidationError) => void;

// Validated once, at the fixture-loading edge; every runner below consumes the typed result.
const scenarios: ScenarioCase[] = (scenarioGroups.cases as RawScenarioCase[]).map((raw) => ({
  'description': raw.description,
  'expected': raw.expected,
  'input': ValidationErrorArgumentsEntity.intake(raw.input),
  'name': raw.name,
  'shape': raw.shape as ScenarioCase['shape']
}));

const runnerMap = {
  'code': (scenario, err) => {
    assert.strictEqual(err.code, scenario.expected.code);
  },
  'correlation-id': (scenario, err) => {
    assert.strictEqual(err.correlationId, scenario.expected.correlationId);
  },
  'detach-violations': (scenario) => {
    const violations = scenario.input.violations;
    assert.ok(violations !== undefined);
    const detached = ValidationError.create(scenario.input);
    (violations[0] as { details?: Record<string, unknown> }).details = { 'limit': 4 };
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
    assert.strictEqual(typeof json.detail, scenario.expected.messageType);
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
    assert.deepStrictEqual(err.violations ?? { 'shape': 'undefined' }, scenario.expected.violations);
  },
  'violations-complex-details': (scenario) => {
    class DetailMarker {
      public readonly label = 'marker';
    }
    const marker = new DetailMarker();
    const rawDetails = scenario.input.violations?.[0]?.details;
    const details = Predicates.isRecord(rawDetails) ? rawDetails : {};
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
    const tagsValue = violation.details?.tags;
    const resultTags = Predicates.isArray(tagsValue) ? tagsValue : undefined;
    const expectedTagsValue = scenario.expected.tags;
    const expectedTags = Predicates.isArray(expectedTagsValue) ? expectedTagsValue : undefined;
    const plainValue = violation.details?.plain;
    const resultPlain = Predicates.isRecord(plainValue) ? plainValue : undefined;
    const nestedValue = resultPlain?.nested;
    const nested = Predicates.isRecord(nestedValue) ? nestedValue : undefined;
    assert.strictEqual(resultTags?.[0], expectedTags?.[0]);
    assert.strictEqual(nested?.count, scenario.expected.count);
    assert.strictEqual(violation.details?.instance, marker);
  },
  'violations-present': (scenario, err) => {
    assert.strictEqual(err.violations?.length, scenario.expected.violationsLength);
  },
  'violations-present-details': (scenario, err) => {
    assert.strictEqual(err.violations?.[0]?.details?.limit, scenario.expected.violationsLimit);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  const err = ValidationError.create(scenario.input);
  runnerMap[scenario.shape](scenario, err);
}

void describe('ValidationError', () => {
  for (const scenario of scenarios) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
