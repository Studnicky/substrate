import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

import { Predicates } from '@studnicky/types/node';

import { entityModelSuite } from '../../src/suites/entityModelSuite.js';
import scenarioGroups from './entityModelSuite.scenarios.json' with { type: 'json' };

const repoRoot = resolve(import.meta.dirname, '../../../..');

const languageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: {
      allowDefaultProject: ['*.ts', 'packages/eslint-config/tests/fixtures/relocated/src/models/*.ts', 'packages/retry/src/models/*.ts'],
      maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20
    },
    tsconfigRootDir: repoRoot
  }
};

type ScenarioCase =
  | {
      description: string;
      expected: {
        rules: Linter.Config['rules'];
      };
      input: {
        rules: Linter.Config['rules'];
      };
      shape: 'preserves-entity-rules';
      name: string;
    }
  | {
      description: string;
      expected: {
        messages: Array<{ messageId: string | null; ruleId: string | null }>;
      };
      input: {
        code: string;
        filename: string;
      };
      shape: 'blocks-inline-disable';
      name: string;
    }
  | {
      description: string;
      expected: {
        messages: Array<{ messageId: string | null; ruleId: string | null }>;
      };
      input: {
        code: string;
        filename: string;
      };
      shape: 'overrides-prefer-function-type';
      name: string;
    }
  | {
      description: string;
      expected: {
        outputs: Array<{
          filename: string;
          messages: Array<{ messageId: string | null; ruleId: string | null }>;
        }>;
      };
      input: {
        scenarios: Array<{
          code: string;
          filename: string;
        }>;
      };
      shape: 'assigns-owning-rule';
      name: string;
    };

const SCENARIO_SHAPES = new Set(['preserves-entity-rules', 'blocks-inline-disable', 'overrides-prefer-function-type', 'assigns-owning-rule']);

function isScenarioShape(value: unknown): value is ScenarioCase['shape'] {
  return typeof value === 'string' && SCENARIO_SHAPES.has(value);
}

function isRuleSeverity(value: unknown): value is Linter.RuleSeverity {
  return value === 0 || value === 1 || value === 2 || value === 'off' || value === 'warn' || value === 'error';
}

function isRuleEntry(value: unknown): value is Linter.RuleEntry {
  if (isRuleSeverity(value)) {
    return true;
  }
  return Array.isArray(value) && isRuleSeverity(value.at(0));
}

function intakeRules(raw: unknown): Linter.Config['rules'] {
  if (!Predicates.isObject(raw)) {
    throw new TypeError(`malformed rules record: ${JSON.stringify(raw)}`);
  }
  const result: Record<string, Linter.RuleEntry> = {};
  for (const [name, entry] of Object.entries(raw)) {
    if (!isRuleEntry(entry)) {
      throw new TypeError(`malformed rule entry for ${name}: ${JSON.stringify(entry)}`);
    }
    result[name] = entry;
  }
  return result;
}

function intakeMessage(raw: unknown): { messageId: string | null; ruleId: string | null } {
  if (!Predicates.isObject(raw) || (raw.messageId !== null && typeof raw.messageId !== 'string') || (raw.ruleId !== null && typeof raw.ruleId !== 'string')) {
    throw new TypeError(`malformed scenario message: ${JSON.stringify(raw)}`);
  }
  return { 'messageId': raw.messageId, 'ruleId': raw.ruleId };
}

function intakeMessages(raw: unknown): Array<{ messageId: string | null; ruleId: string | null }> {
  if (!Array.isArray(raw)) {
    throw new TypeError(`malformed scenario messages: ${JSON.stringify(raw)}`);
  }
  return raw.map(intakeMessage);
}

function intakeCodeInput(raw: unknown): { code: string; filename: string } {
  if (!Predicates.isObject(raw) || typeof raw.code !== 'string' || typeof raw.filename !== 'string') {
    throw new TypeError(`malformed scenario input: ${JSON.stringify(raw)}`);
  }
  return { 'code': raw.code, 'filename': raw.filename };
}

const SCENARIO_PAYLOAD_INTAKE: Record<ScenarioCase['shape'], (name: string, description: string, rawInput: unknown, rawExpected: unknown) => ScenarioCase> = {
  'assigns-owning-rule': (name, description, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawInput) || !Array.isArray(rawInput.scenarios)) {
      throw new TypeError(`malformed assigns-owning-rule input: ${JSON.stringify(rawInput)}`);
    }
    if (!Predicates.isObject(rawExpected) || !Array.isArray(rawExpected.outputs)) {
      throw new TypeError(`malformed assigns-owning-rule expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'description': description,
      'expected': {
        'outputs': rawExpected.outputs.map((raw) => {
          if (!Predicates.isObject(raw) || typeof raw.filename !== 'string') {
            throw new TypeError(`malformed assigns-owning-rule output: ${JSON.stringify(raw)}`);
          }
          return { 'filename': raw.filename, 'messages': intakeMessages(raw.messages) };
        })
      },
      'input': { 'scenarios': rawInput.scenarios.map(intakeCodeInput) },
      'name': name,
      'shape': 'assigns-owning-rule'
    };
  },
  'blocks-inline-disable': (name, description, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed blocks-inline-disable expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'description': description,
      'expected': { 'messages': intakeMessages(rawExpected.messages) },
      'input': intakeCodeInput(rawInput),
      'name': name,
      'shape': 'blocks-inline-disable'
    };
  },
  'overrides-prefer-function-type': (name, description, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed overrides-prefer-function-type expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'description': description,
      'expected': { 'messages': intakeMessages(rawExpected.messages) },
      'input': intakeCodeInput(rawInput),
      'name': name,
      'shape': 'overrides-prefer-function-type'
    };
  },
  'preserves-entity-rules': (name, description, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawInput)) {
      throw new TypeError(`malformed preserves-entity-rules input: ${JSON.stringify(rawInput)}`);
    }
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed preserves-entity-rules expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'description': description,
      'expected': { 'rules': intakeRules(rawExpected.rules) },
      'input': { 'rules': intakeRules(rawInput.rules) },
      'name': name,
      'shape': 'preserves-entity-rules'
    };
  }
};

function intakeScenarioCase(raw: unknown): ScenarioCase {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || typeof raw.description !== 'string' || !isScenarioShape(raw.shape)) {
    throw new TypeError(`malformed entityModelSuite scenario entry: ${JSON.stringify(raw)}`);
  }
  return SCENARIO_PAYLOAD_INTAKE[raw.shape](raw.name, raw.description, raw.input, raw.expected);
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'assigns-owning-rule': (scenarioCase) => {
    const actualOutputs = scenarioCase.input.scenarios.map((scenario) => {
      const linter = new Linter();
      const messages = linter.verify(
        scenario.code,
        [
          {
            files: ['**/*.ts'],
            languageOptions,
            plugins: { '@typescript-eslint': tseslint.plugin }
          },
          entityModelSuite
        ],
        { filename: scenario.filename }
      );

      return {
        filename: scenario.filename,
        messages: messages.map((message) => ({
          'messageId': message.messageId ?? null,
          'ruleId': message.ruleId ?? null
        }))
      };
    });

    assert.deepEqual(actualOutputs, scenarioCase.expected.outputs);
  },
  'blocks-inline-disable': (scenarioCase) => {
    const linter = new Linter();
    const messages = linter.verify(
      scenarioCase.input.code,
      [
        {
          files: ['**/*.ts'],
          languageOptions,
          plugins: { '@typescript-eslint': tseslint.plugin }
        },
        entityModelSuite
      ],
      { filename: scenarioCase.input.filename }
    );

    assert.deepEqual(messages.map((message) => ({
      'messageId': message.messageId ?? null,
      'ruleId': message.ruleId ?? null
    })), scenarioCase.expected.messages);
  },
  'overrides-prefer-function-type': (scenarioCase) => {
    const linter = new Linter();
    const messages = linter.verify(
      scenarioCase.input.code,
      [
        {
          files: ['**/*.ts'],
          languageOptions,
          plugins: { '@typescript-eslint': tseslint.plugin },
          rules: { '@typescript-eslint/prefer-function-type': 'error' }
        },
        entityModelSuite
      ],
      { filename: scenarioCase.input.filename }
    );

    assert.deepEqual(messages.map((message) => ({
      'messageId': message.messageId ?? null,
      'ruleId': message.ruleId ?? null
    })), scenarioCase.expected.messages);
  },
  'preserves-entity-rules': (scenarioCase) => {
    assert.deepEqual(scenarioCase.input.rules, scenarioCase.expected.rules);
    assert.deepEqual(entityModelSuite.linterOptions, { noInlineConfig: true });
    assert.deepEqual(entityModelSuite.rules, scenarioCase.expected.rules);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('entityModelSuite', () => {
  for (const scenario of scenarioGroups.cases.map(intakeScenarioCase)) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
