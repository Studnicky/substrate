import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfacesComposeNamedTypes } from '../../src/rules/interfacesComposeNamedTypes.js';
import { noMixedCallableShapes } from '../../src/rules/noMixedCallableShapes.js';
import scenarioGroups from './interfacesComposeNamedTypes.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const languageOptions = {
  parser,
  parserOptions: {
    projectService: {
      allowDefaultProject: ['*.ts'],
      maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30
    },
    tsconfigRootDir: import.meta.dirname
  }
};

const ruleTester = new RuleTester({ languageOptions });

void describe('interfaces-compose-named-types', () => {
  void it('validates interface composition rules', () => {
    ruleTester.run('interfaces-compose-named-types', interfacesComposeNamedTypes, scenarioGroups);
  });

  void it('a mixed member yields the no-mixed-callable-shapes diagnostic alone, not a second contradictory one', () => {
    const linter = new Linter();
    const messages = linter.verify(
      scenarioGroups.combined.code,
      [
        {
          files: ['**/*.ts'],
          languageOptions,
          plugins: {
            local: {
              rules: {
                'interfaces-compose-named-types': interfacesComposeNamedTypes,
                'no-mixed-callable-shapes': noMixedCallableShapes
              }
            }
          },
          rules: {
            'local/interfaces-compose-named-types': 'error',
            'local/no-mixed-callable-shapes': 'error'
          }
        }
      ],
      { filename: scenarioGroups.combined.filename }
    );

    assert.deepEqual(
      messages.map((message) => { return message.messageId; }),
      scenarioGroups.combined.expectedMessageIds
    );
  });
});
