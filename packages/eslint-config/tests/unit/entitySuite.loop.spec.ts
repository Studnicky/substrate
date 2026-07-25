import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

import { entitySuite } from '../../src/suites/entitySuite.js';
import scenarioGroups from './entitySuite.scenarios.json';

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

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
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
          entitySuite
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
        entitySuite
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
        entitySuite
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
    assert.deepEqual(entitySuite.linterOptions, { noInlineConfig: true });
    assert.deepEqual(entitySuite.rules, scenarioCase.expected.rules);
  }
};

void describe('entitySuite', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runnerMap[scenario.shape](scenario);
    });
  }
});
