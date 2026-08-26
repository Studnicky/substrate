import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IntakeCompiler } from '../../../src/IntakeCompiler.js';
import scenarioGroups from './intake-compiler.scenarios.json' with { type: 'json' };

interface WidgetEntityInterface {
  readonly 'name': string;
}

class WidgetTestError extends Error {
  public readonly entityName: string;
  public readonly reason: string;

  public constructor(entityName: string, reason: string) {
    super(`${entityName}: ${reason}`);
    this.entityName = entityName;
    this.reason = reason;
  }
}

const CONFIG: IntakeCompiler.BoundaryConfigInterface = {
  'clone': (value) => structuredClone(value),
  'onInvalidCandidate': (entityName, reason) => { throw new WidgetTestError(entityName, reason); }
};

const parser: IntakeCompiler.ParserInterface<WidgetEntityInterface> = (candidate) => {
  const rawName = candidate.name;
  if (typeof rawName === 'string') {
    return { 'name': rawName };
  }
  return undefined;
};

type ScenarioShape =
  | 'clone-isolation'
  | 'compile-independent'
  | 'create-passthrough'
  | 'create-throws'
  | 'intake-rejects-invalid-candidate'
  | 'intake-rejects-parser-undefined';

type ScenarioInput = {
  candidate?: Record<string, unknown>;
  candidates?: unknown[];
  createCandidate?: Record<string, unknown>;
  intakeCandidate?: Record<string, unknown>;
  originalName?: string;
};

type ExpectedObject = {
  createResult?: Record<string, unknown>;
  intakeResult?: Record<string, unknown>;
  message?: string;
  result?: Record<string, unknown>;
};

type ScenarioCase = {
  description: string;
  expected: ExpectedObject;
  input: ScenarioInput;
  name: string;
  shape: ScenarioShape;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const requireCandidate = (scenarioCase: ScenarioCase): Record<string, unknown> => {
  const { candidate } = scenarioCase.input;
  assert.ok(candidate !== undefined, `${scenarioCase.name} must define input.candidate`);
  return candidate;
};

const requireMessage = (scenarioCase: ScenarioCase): string => {
  const { message } = scenarioCase.expected;
  assert.ok(typeof message === 'string', `${scenarioCase.name} must define expected.message`);
  return message;
};

const requireResult = (scenarioCase: ScenarioCase): Record<string, unknown> => {
  const { result } = scenarioCase.expected;
  assert.ok(result !== undefined, `${scenarioCase.name} must define expected.result`);
  return result;
};

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'clone-isolation': (scenarioCase) => {
    let observedCandidate: unknown;
    const observingParser: IntakeCompiler.ParserInterface<WidgetEntityInterface> = (candidate) => {
      observedCandidate = candidate;
      Reflect.set(candidate, 'name', 'mutated');
      return { 'name': String(candidate.name) };
    };
    const { intake } = IntakeCompiler.compile(observingParser, 'WidgetEntity', CONFIG);
    const originalName = scenarioCase.input.originalName ?? 'original';
    const original = { 'name': originalName };
    intake(original);
    assert.equal(original.name, originalName);
    assert.notEqual(observedCandidate, original);
  },
  'compile-independent': (scenarioCase) => {
    const { createCandidate, intakeCandidate } = scenarioCase.input;
    assert.ok(createCandidate !== undefined, `${scenarioCase.name} must define input.createCandidate`);
    assert.ok(intakeCandidate !== undefined, `${scenarioCase.name} must define input.intakeCandidate`);
    const { createResult, intakeResult } = scenarioCase.expected;
    assert.ok(createResult !== undefined, `${scenarioCase.name} must define expected.createResult`);
    assert.ok(intakeResult !== undefined, `${scenarioCase.name} must define expected.intakeResult`);

    const create = IntakeCompiler.compileCreate(parser, 'WidgetEntity', CONFIG);
    const intake = IntakeCompiler.compileIntake(parser, 'WidgetEntity', CONFIG);
    assert.deepEqual(create(createCandidate as Partial<WidgetEntityInterface>), createResult);
    assert.deepEqual(intake(intakeCandidate), intakeResult);
  },
  'create-passthrough': (scenarioCase) => {
    const { create } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    const result = create(requireCandidate(scenarioCase) as Partial<WidgetEntityInterface>);
    assert.deepEqual(result, requireResult(scenarioCase));
  },
  'create-throws': (scenarioCase) => {
    const { create } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    const candidate = requireCandidate(scenarioCase) as unknown as Partial<WidgetEntityInterface>;
    assert.throws(() => create(candidate), { 'message': requireMessage(scenarioCase) });
  },
  'intake-rejects-invalid-candidate': (scenarioCase) => {
    const { intake } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    const { candidates } = scenarioCase.input;
    assert.ok(Array.isArray(candidates), `${scenarioCase.name} must define input.candidates`);
    const message = requireMessage(scenarioCase);
    for (const candidate of candidates) {
      assert.throws(() => intake(candidate), { message });
    }
  },
  'intake-rejects-parser-undefined': (scenarioCase) => {
    const { intake } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    assert.throws(() => intake(requireCandidate(scenarioCase)), { 'message': requireMessage(scenarioCase) });
  }
};

void describe('IntakeCompiler.compile', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runnerMap[scenarioCase.shape](scenarioCase);
    });
  }
});
