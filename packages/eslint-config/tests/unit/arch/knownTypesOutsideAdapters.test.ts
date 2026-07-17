import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { knownTypesOutsideAdapters } from '../../../src/rules/arch/knownTypesOutsideAdapters.js';

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
  'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  'sourceRoot': 'src'
}];

ruleTester.run('known-types-outside-adapters', knownTypesOutsideAdapters, {
  'invalid': [
    {
      'code': 'function parse(input: any): void {}',
      'errors': [{ 'messageId': 'noAny' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': "domain-layer file using 'any' — forbidden",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: unknown): void {}',
      'errors': [{ 'messageId': 'noUnknown' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': "domain-layer file using 'unknown' — forbidden",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: any): void {}',
      'errors': [{ 'messageId': 'noAny' }],
      'filename': '/repo/src/application/UserService.ts',
      'name': "application-layer file using 'any' — forbidden",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: unknown): void {}',
      'errors': [{ 'messageId': 'noUnknown' }],
      'filename': '/repo/src/ports/UserPort.ts',
      'name': "ports-layer file using 'unknown' — forbidden",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: any): void {}',
      'errors': [{ 'messageId': 'noAny' }],
      'filename': '/repo/src/infrastructure/Bootstrap.ts',
      'name': "infrastructure-layer file using 'any' — forbidden despite being able to import any layer",
      'options': baseOptions
    },
    {
      'code': 'let value: any; let other: unknown;',
      'errors': [{ 'messageId': 'noAny' }, { 'messageId': 'noUnknown' }],
      'filename': '/repo/src/domain/user/User.ts',
      'name': "domain-layer file using both 'any' and 'unknown' — both flagged",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: any): void {}',
      'errors': [{ 'messageId': 'noAny' }],
      'filename': '/repo/src/implementations/HttpAdapter.ts',
      'name': "implementations-layer file using 'any' without adapterLayerName configured — flagged, default \"adapters\" name does not match \"implementations\"",
      'options': [{
        'layers': ['domain', 'ports', 'application', 'implementations', 'infrastructure'],
        'sourceRoot': 'src'
      }]
    }
  ],
  'valid': [
    {
      'code': 'function parse(input: any): unknown { return input; }',
      'filename': '/repo/src/adapters/HttpAdapter.ts',
      'name': "adapters-layer file using 'any'/'unknown' — allowed, adapters are exempt",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: string): number { return input.length; }',
      'filename': '/repo/src/domain/user/UserService.ts',
      'name': "domain-layer file using only known types — not flagged",
      'options': baseOptions
    },
    {
      'code': 'function parse(input: any): void {}',
      'filename': '/repo/scripts/build.ts',
      'name': 'file outside the configured layer tree — out of scope for this rule',
      'options': baseOptions
    },
    {
      'code': 'function parse(input: any): void {}',
      'filename': '/repo/src/implementations/HttpAdapter.ts',
      'name': 'implementations-layer file with adapterLayerName configured — allowed, configured exemption name is respected',
      'options': [{
        'adapterLayerName': 'implementations',
        'layers': ['domain', 'ports', 'application', 'implementations', 'infrastructure'],
        'sourceRoot': 'src'
      }]
    },
    {
      'code': 'function parse(input: any): void {}',
      'filename': '/repo/src/domain/user/User.ts',
      'name': 'rule with no options configured — no-op',
      'options': []
    }
  ]
});
