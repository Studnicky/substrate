import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

import { entityModelSuite } from '../../src/suites/entityModelSuite.js';
import scenarioGroups from './entityModelSuite.scenarios.json' with { type: 'json' };

const repoRoot = resolve(import.meta.dirname, '../../../..');

const languageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: {
      allowDefaultProject: ['*.ts', 'packages/retry/src/models/*.ts'],
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
      input: Record<string, never>;
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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
