import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { adapterOnlyImport } from '../../../src/rules/arch/adapterOnlyImport.js';

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
  'adapterOnlyImports': ['express', 'pg', 'axios'],
  'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  'sourceRoot': 'src'
}];

ruleTester.run('adapter-only-import', adapterOnlyImport, {
  'invalid': [
    {
      'code': "import axios from 'axios';",
      'errors': [{ 'messageId': 'adapterOnlyImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file importing an adapter-only package — forbidden',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'errors': [{ 'messageId': 'adapterOnlyImport' }],
      'filename': '/repo/src/application/UserService.ts',
      'name': 'application-layer file importing an adapter-only package — forbidden',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'errors': [{ 'messageId': 'adapterOnlyImport' }],
      'filename': '/repo/src/infrastructure/Bootstrap.ts',
      'name': 'infrastructure-layer file importing an adapter-only package — forbidden despite being able to import any layer',
      'options': baseOptions
    },
    {
      'code': "import { Client } from 'pg/lib/client';",
      'errors': [{ 'messageId': 'adapterOnlyImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain-layer file importing a submodule of an adapter-only root — forbidden, exercises prefix match',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'errors': [{ 'messageId': 'adapterOnlyImport' }],
      'filename': '/repo/src/implementations/HttpAdapter.ts',
      'name': 'implementations-layer file importing an adapter-only package without adapterLayerName configured — flagged, default "adapters" name does not match "implementations"',
      'options': [{
        'adapterOnlyImports': ['express', 'pg', 'axios'],
        'layers': ['domain', 'ports', 'application', 'implementations', 'infrastructure'],
        'sourceRoot': 'src'
      }]
    }
  ],
  'valid': [
    {
      'code': "import axios from 'axios';",
      'filename': '/repo/src/adapters/HttpAdapter.ts',
      'name': 'adapters-layer file importing an adapter-only package — allowed, adapters are exempt',
      'options': baseOptions
    },
    {
      'code': "import { User } from './User';",
      'filename': '/repo/src/domain/user/UserService.ts',
      'name': 'domain-layer file importing something not in adapterOnlyImports — not flagged',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'filename': '/repo/scripts/build.ts',
      'name': 'file outside the configured layer tree — out of scope for this rule',
      'options': baseOptions
    },
    {
      'code': "import axios from 'axios';",
      'filename': '/repo/src/implementations/HttpAdapter.ts',
      'name': 'implementations-layer file with adapterLayerName configured — allowed, configured exemption name is respected',
      'options': [{
        'adapterLayerName': 'implementations',
        'adapterOnlyImports': ['express', 'pg', 'axios'],
        'layers': ['domain', 'ports', 'application', 'implementations', 'infrastructure'],
        'sourceRoot': 'src'
      }]
    }
  ]
});
