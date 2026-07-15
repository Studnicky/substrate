import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { domainPurity } from '../../../src/rules/arch/domainPurity.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

const baseOptions = [{
  'forbiddenCalls': ['Date.now', 'Math.random'],
  'forbiddenImports': ['fs', 'axios', 'node:fs'],
  'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  'sourceRoot': 'src'
}];

ruleTester.run('domain-purity', domainPurity, {
  'invalid': [
    {
      'code': "import axios from 'axios';",
      'errors': [{ 'messageId': 'impureImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file importing a forbidden import — flagged',
      'options': baseOptions
    },
    {
      'code': 'const timestamp = Date.now();',
      'errors': [{ 'messageId': 'impureCall' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file calling a forbidden call — flagged',
      'options': baseOptions
    },
    {
      'code': "import promises from 'node:fs/promises';",
      'errors': [{ 'messageId': 'impureImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file importing a submodule of a forbidden root — flagged via prefix match',
      'options': baseOptions
    }
  ],
  'valid': [
    {
      'code': "import { User } from './User.js';",
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file importing something not in forbiddenImports — not flagged',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'filename': '/repo/src/application/UserService.ts',
      'name': 'non-domain-layer file importing a forbidden import — not flagged, rule only applies inside domain',
      'options': baseOptions
    },
    {
      'code': 'const id = crypto.randomUUID();',
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file calling something not in forbiddenCalls — not flagged',
      'options': baseOptions
    }
  ]
});
