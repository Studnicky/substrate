import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/browser';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import { ValidationErrorScenarioCaseEntity } from './entities/ValidationErrorScenarioCaseEntity.js';
import scenarioGroups from './validation-error.scenarios.json' with { 'type': 'json' };

class ValidationErrorRunners {
  static 'code'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'code'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'correlation-id'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'correlation-id'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
  }

  static 'detach-violations'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'detach-violations'>): void {
    const violations = scenarioCase.input.violations;
    assert.ok(violations !== undefined);
    const violation = violations[0];
    assert.ok(violation !== undefined);
    const detached = ValidationError.create(scenarioCase.input);
    violation.details = { 'limit': 4 };
    assert.deepStrictEqual(detached.violations, scenarioCase.expected.violations);
    const projection = detached.violations?.[0];
    if (projection?.details !== undefined) {
      Reflect.set(projection.details, 'limit', 5);
    }
    assert.deepStrictEqual(detached.violations, scenarioCase.expected.violations);
  }

  static 'instanceof'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'instanceof'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof BaseError);
    assert.ok(error instanceof ValidationError);
  }

  static 'json-excludes-violations'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'json-excludes-violations'>): void {
    const error = ValidationError.create(scenarioCase.input);
    const json = error.toJSON();
    assert.strictEqual('violations' in json, scenarioCase.expected.hasViolations);
  }

  static 'json-includes-violations'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'json-includes-violations'>): void {
    const error = ValidationError.create(scenarioCase.input);
    const json = error.toJSON();
    assert.strictEqual('violations' in json, scenarioCase.expected.hasViolations);
  }

  static 'json-roundtrip'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'json-roundtrip'>): void {
    const error = ValidationError.create(scenarioCase.input);
    let parsed: ProblemDetailsEntity.Type;
    try {
      parsed = ProblemDetailsEntity.intake(JSON.parse(JSON.stringify(error.toJSON())));
    } catch (cause) {
      throw RuntimeError.create('ValidationError JSON round trip failed', { 'cause': cause });
    }
    assert.strictEqual(parsed.code, scenarioCase.expected.code);
  }

  static 'json-serializes'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'json-serializes'>): void {
    const error = ValidationError.create(scenarioCase.input);
    const json = error.toJSON();
    assert.strictEqual(json.code, scenarioCase.expected.code);
    assert.strictEqual(typeof json.detail, scenarioCase.expected.messageType);
  }

  static 'message-with-path'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'message-with-path'>): void {
    const error = ValidationError.create(scenarioCase.input);
    for (const fragment of scenarioCase.expected.messageIncludes ?? []) {
      assert.ok(error.message.includes(fragment));
    }
  }

  static 'retryable'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'retryable'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  }

  static 'user-message-empty-violations'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'user-message-empty-violations'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.toUserMessage(), scenarioCase.expected.message);
  }

  static 'user-message-plain'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'user-message-plain'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.toUserMessage(), scenarioCase.expected.message);
  }

  static 'user-message-violations'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'user-message-violations'>): void {
    const error = ValidationError.create(scenarioCase.input);
    const message = error.toUserMessage();
    for (const fragment of scenarioCase.expected.messageIncludes ?? []) {
      assert.ok(message.includes(fragment));
    }
  }

  static 'violations-absent'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'violations-absent'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.deepStrictEqual(error.violations ?? { 'shape': 'undefined' }, scenarioCase.expected.violations);
  }

  static 'violations-complex-details'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'violations-complex-details'>): void {
    class DetailMarker {
      public readonly label = 'marker';
    }
    const marker = new DetailMarker();
    const errorWithComplexDetails = ValidationErrorRunners.createComplexDetailsError(scenarioCase, marker);
    const violation = errorWithComplexDetails.violations?.[0];
    assert.ok(violation !== undefined);
    const resultTags = ValidationErrorRunners.readArray(violation.details?.tags);
    const expectedTags = ValidationErrorRunners.readArray(scenarioCase.expected.tags);
    const resultPlain = ValidationErrorRunners.readRecord(violation.details?.plain);
    const nested = ValidationErrorRunners.readRecord(resultPlain?.nested);
    assert.strictEqual(resultTags?.[0], expectedTags?.[0]);
    assert.strictEqual(nested?.count, scenarioCase.expected.count);
    assert.strictEqual(violation.details?.instance, marker);
  }

  static 'violations-present'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'violations-present'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.violations?.length, scenarioCase.expected.violationsLength);
  }

  static 'violations-present-details'(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'violations-present-details'>): void {
    const error = ValidationError.create(scenarioCase.input);
    assert.strictEqual(error.violations?.[0]?.details?.limit, scenarioCase.expected.violationsLimit);
  }


  private static createComplexDetailsError(scenarioCase: ScenarioCaseOfType<ValidationErrorScenarioCaseEntity.Type, 'violations-complex-details'>, marker: object): ValidationError {
    const details = ValidationErrorRunners.readRecord(scenarioCase.input.violations?.[0]?.details) ?? {};
    const result = ValidationError.create({
      'message': scenarioCase.input.message,
      'path': scenarioCase.input.path,
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
    return result;
  }

  private static readArray(value: unknown): readonly unknown[] | undefined {
    const result = Predicates.isArray(value) ? value : undefined;
    return result;
  }

  private static readRecord(value: unknown): Record<string, unknown> | undefined {
    const result = Predicates.isRecord(value) ? value : undefined;
    return result;
  }
}

ScenarioSuite.register({
  'entity': ValidationErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ValidationError',
  'runners': ValidationErrorRunners
});
