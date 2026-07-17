import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { layerImportBoundary } from '../../../src/rules/arch/layerImportBoundary.js';

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
  'aliasPrefixes': { '@adapters/': 'adapters', '@application/': 'application', '@domain/': 'domain', '@ports/': 'ports' },
  'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  'sourceRoot': 'src'
}];

ruleTester.run('layer-import-boundary', layerImportBoundary, {
  'invalid': [
    {
      'code': "import { Service } from '@application/Service';",
      'errors': [{ 'messageId': 'crossLayerImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain importing from application — forbidden per default matrix',
      'options': baseOptions
    },
    {
      'code': "import { Adapter } from '@adapters/FooAdapter';",
      'errors': [{ 'messageId': 'crossLayerImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'domain importing from adapters — forbidden per default matrix',
      'options': baseOptions
    },
    {
      'code': "import { FooAdapter } from '../../adapters/fooAdapter';",
      'errors': [{ 'messageId': 'crossLayerImport' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'relative import from domain resolving into adapters — forbidden, exercises relative-path-fallback resolution',
      'options': baseOptions
    }
  ],
  'valid': [
    {
      'code': "import { User } from '@domain/User';",
      'filename': '/repo/src/application/UserService.ts',
      'name': 'application importing from domain — allowed',
      'options': baseOptions
    },
    {
      'code': "import { Port } from '@ports/Port';",
      'filename': '/repo/src/adapters/FooAdapter.ts',
      'name': 'adapters importing from ports — allowed',
      'options': baseOptions
    },
    {
      'code': "import { Adapter } from '@adapters/FooAdapter';",
      'filename': '/repo/src/infrastructure/Bootstrap.ts',
      'name': 'infrastructure importing from adapters — allowed, infrastructure can import anything configured',
      'options': baseOptions
    },
    {
      'code': "import lodash from 'lodash';",
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'bare npm package import — never flagged regardless of source layer',
      'options': baseOptions
    },
    {
      'code': "import { Anything } from '@application/Anything';",
      'filename': '/repo/scripts/build.ts',
      'name': 'file not under configured sourceRoot/layers tree — never flagged',
      'options': baseOptions
    },
    {
      'code': "import { Service } from '@application/Service';",
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'allowedImports override permits an otherwise-forbidden direction — not flagged',
      'options': [{
        ...baseOptions[0],
        'allowedImports': { 'domain': ['domain', 'application'] }
      }]
    }
  ]
});
