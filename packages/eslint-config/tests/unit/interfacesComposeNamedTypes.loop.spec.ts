import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfacesComposeNamedTypes } from '../../src/rules/interfacesComposeNamedTypes.js';
import scenarioGroups from './interfacesComposeNamedTypes.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: import.meta.dirname
    }
  }
});

void describe('interfaces-compose-named-types', () => {
  void it('validates interface composition rules', () => {
    ruleTester.run('interfaces-compose-named-types', interfacesComposeNamedTypes, scenarioGroups);
  });
});
