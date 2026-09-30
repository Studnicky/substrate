import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noNativeError } from '../../src/rules/noNativeError.js';
import scenarioGroups from './noNativeError.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// The abort-reason check resolves the receiver's type through the checker, so the
// scenarios run under typed linting.
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['packages/eslint-config/*.ts'],
        defaultProject: 'packages/store/tsconfig.json',
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 60
      },
      tsconfigRootDir: repoRoot
    }
  }
});

// Without type-aware parser services the throw, reject, and abort-reason checks report nothing.
const untypedRuleTester = new RuleTester();

void describe('no-native-error', () => {
  void it('validates no-native-error scenarios', () => {
    ruleTester.run('no-native-error', noNativeError, scenarioGroups);
  });

  void it('resolves globals declared only by @types/node', () => {
    ruleTester.run('no-native-error-node-only', noNativeError, {
      'invalid': [
        {
          'code': 'export function cloneValue(value: RegExp): RegExp { return structuredClone(value); }',
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/node-only/Probe.ts',
          'name': 'structuredClone declared only by @types/node globals is reported unguarded'
        }
      ],
      'valid': [
        {
          'code': 'export function cloneValue(value: RegExp): RegExp | undefined { try { return structuredClone(value); } catch { return undefined; } }',
          'filename': 'packages/eslint-config/tests/fixtures/node-only/Probe.ts',
          'name': 'structuredClone declared only by @types/node globals inside try with catch is not reported'
        },
        {
          'code': "export const worker = new SharedWorker('worker.js');",
          'filename': 'packages/eslint-config/tests/fixtures/node-only/Probe.ts',
          'name': 'a DOM-only API is not resolved in a project without the DOM lib'
        }
      ]
    });
  });

  void it('resolves the WebWorker lib File System Access classes', () => {
    ruleTester.run('no-native-error-webworker', noNativeError, {
      'invalid': [
        {
          'code': "declare const handle: FileSystemFileHandle; export function run(): void { const access = handle.createSyncAccessHandle(); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemFileHandle#createSyncAccessHandle unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.read(new Uint8Array()); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#read unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.write(new Uint8Array()); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#write unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.flush(); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#flush unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.truncate(0); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#truncate unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.getSize(); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#getSize unguarded is reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { access.close(); }",
          'errors': [{ 'messageId': 'unguardedPlatformCall' }],
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#close unguarded is reported'
        }
      ],
      'valid': [
        {
          'code': "declare const handle: FileSystemFileHandle; export function run(): void { try { const access = handle.createSyncAccessHandle(); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemFileHandle#createSyncAccessHandle inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.read(new Uint8Array()); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#read inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.write(new Uint8Array()); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#write inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.flush(); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#flush inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.truncate(0); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#truncate inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.getSize(); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#getSize inside try with catch is not reported'
        },
        {
          'code': "declare const access: FileSystemSyncAccessHandle; export function run(): void { try { access.close(); } catch { return; } }",
          'filename': 'packages/eslint-config/tests/fixtures/webworker/Probe.ts',
          'name': 'FileSystemSyncAccessHandle#close inside try with catch is not reported'
        }
      ]
    });
  });

  void it('reports nothing for throw, reject, and abort reasons without type information', () => {
    untypedRuleTester.run('no-native-error-untyped', noNativeError, {
      'invalid': [],
      'valid': [
        { 'code': 'export function fail(error) { throw error; }', 'name': 'a throw is not checked without type information' },
        { 'code': 'export const pending = new Promise((resolve, reject) => { reject(1); });', 'name': 'a reject is not checked without type information' },
        { 'code': 'export const pending = Promise.reject(1);', 'name': 'Promise.reject is not checked without type information' },
        { 'code': 'const controller = new AbortController(); controller.abort(1);', 'name': 'an abort reason is not checked without type information' }
      ]
    });
  });
});
