import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import scenarioGroups from './validation-error.scenarios.json' with { type: 'json' };

interface ScenarioExpectedInterface {
  code?: string;
  correlationId?: string;
  count?: number;
  hasViolations?: boolean;
  message?: string;
  messageIncludes?: readonly string[];
  messageType?: string;
  retryable?: boolean;
  tags?: readonly unknown[];
  violations?: { 'shape': 'undefined' } | readonly { details?: Record<string, unknown>; message: string; path: string }[];
  violationsLength?: number;
  violationsLimit?: number;
}

type ScenarioShape = 'code' | 'correlation-id' | 'detach-violations' | 'instanceof' | 'json-excludes-violations' | 'json-includes-violations' | 'json-roundtrip' | 'json-serializes' | 'message-with-path' | 'retryable' | 'user-message-empty-violations' | 'user-message-plain' | 'user-message-violations' | 'violations-absent' | 'violations-present' | 'violations-present-details' | 'violations-complex-details';

type ScenarioCase = {
  expected: ScenarioExpectedInterface;
  input: ValidationErrorArgumentsEntity.Type;
  name: string;
  shape: ScenarioShape;
};

type ScenarioRunner = (scenario: ScenarioCase, err: ValidationError) => void;

const SCENARIO_SHAPES: readonly ScenarioShape[] = ['code', 'correlation-id', 'detach-violations', 'instanceof', 'json-excludes-violations', 'json-includes-violations', 'json-roundtrip', 'json-serializes', 'message-with-path', 'retryable', 'user-message-empty-violations', 'user-message-plain', 'user-message-violations', 'violations-absent', 'violations-present', 'violations-present-details', 'violations-complex-details'];

function isScenarioShape(value: unknown): value is ScenarioShape {
  const shapes: readonly string[] = SCENARIO_SHAPES;
  return typeof value === 'string' && shapes.includes(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number';
}

function isOptionalReadonlyStringArray(value: unknown): value is readonly string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));
}

function isExpectedViolation(value: unknown): value is { details?: Record<string, unknown>; message: string; path: string } {
  return Predicates.isObject(value) && typeof value.message === 'string' && typeof value.path === 'string' && (value.details === undefined || Predicates.isObject(value.details));
}

function isExpectedViolations(value: unknown): value is ScenarioExpectedInterface['violations'] {
  if (value === undefined) {
    return true;
  }
  if (Predicates.isObject(value)) {
    return value.shape === 'undefined';
  }
  return Array.isArray(value) && value.every(isExpectedViolation);
}

/** Validates the fixture envelope, including `expected`'s known keys, at the JSON-load edge. */
function intakeScenarioCase(raw: unknown): ScenarioCase {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isScenarioShape(raw.shape) || !Predicates.isObject(raw.expected)) {
    throw new TypeError(`malformed ValidationError scenario entry: ${JSON.stringify(raw)}`);
  }
  const { expected } = raw;
  if (
    !isOptionalString(expected.code) || !isOptionalString(expected.correlationId) || !isOptionalNumber(expected.count)
    || !isOptionalBoolean(expected.hasViolations) || !isOptionalString(expected.message) || !isOptionalReadonlyStringArray(expected.messageIncludes)
    || !isOptionalString(expected.messageType) || !isOptionalBoolean(expected.retryable) || !isExpectedViolations(expected.violations)
    || !isOptionalNumber(expected.violationsLength) || !isOptionalNumber(expected.violationsLimit)
    || (expected.tags !== undefined && !Array.isArray(expected.tags))
  ) {
    throw new TypeError(`malformed ValidationError scenario expected: ${JSON.stringify(expected)}`);
  }
  return {
    'expected': {
      ...(expected.code === undefined ? {} : { 'code': expected.code }),
      ...(expected.correlationId === undefined ? {} : { 'correlationId': expected.correlationId }),
      ...(expected.count === undefined ? {} : { 'count': expected.count }),
      ...(expected.hasViolations === undefined ? {} : { 'hasViolations': expected.hasViolations }),
      ...(expected.message === undefined ? {} : { 'message': expected.message }),
      ...(expected.messageIncludes === undefined ? {} : { 'messageIncludes': expected.messageIncludes }),
      ...(expected.messageType === undefined ? {} : { 'messageType': expected.messageType }),
      ...(expected.retryable === undefined ? {} : { 'retryable': expected.retryable }),
      ...(expected.tags === undefined ? {} : { 'tags': expected.tags }),
      ...(expected.violations === undefined ? {} : { 'violations': expected.violations }),
      ...(expected.violationsLength === undefined ? {} : { 'violationsLength': expected.violationsLength }),
      ...(expected.violationsLimit === undefined ? {} : { 'violationsLimit': expected.violationsLimit })
    },
    'input': ValidationErrorArgumentsEntity.intake(raw.input),
    'name': raw.name,
    'shape': raw.shape
  };
}

// Validated once, at the fixture-loading edge; every runner below consumes the typed result.
const scenarios: ScenarioCase[] = scenarioGroups.cases.map(intakeScenarioCase);

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
    const violation = violations[0];
    assert.ok(violation !== undefined);
    const detached = ValidationError.create(scenario.input);
    violation.details = { 'limit': 4 };
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
    const json = err.toJSON();
    assert.strictEqual('violations' in json, scenario.expected.hasViolations);
  },
  'json-includes-violations': (scenario, err) => {
    const json = err.toJSON();
    assert.strictEqual('violations' in json, scenario.expected.hasViolations);
  },
  'json-roundtrip': (scenario, err) => {
    const parsed = ProblemDetailsEntity.intake(JSON.parse(JSON.stringify(err.toJSON())));
    assert.strictEqual(parsed.code, scenario.expected.code);
  },
  'json-serializes': (scenario, err) => {
    const json = err.toJSON();
    assert.strictEqual(json.code, scenario.expected.code);
    assert.strictEqual(typeof json.detail, scenario.expected.messageType);
  },
  'message-with-path': (scenario, err) => {
    for (const fragment of scenario.expected.messageIncludes ?? []) {
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
    for (const fragment of scenario.expected.messageIncludes ?? []) {
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
