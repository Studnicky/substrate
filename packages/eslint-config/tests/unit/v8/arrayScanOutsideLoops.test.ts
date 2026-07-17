import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayScanOutsideLoops } from '../../../src/rules/v8/arrayScanOutsideLoops.js';

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repoRoot
    }
  }
});

ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
  'valid': [
    {
      'code': 'declare const records: { id: number }[]; declare const id: number; const match = records.find((r) => r.id === id);',
      'name': 'find() outside any loop — not flagged'
    },
    {
      'code': 'declare const seen: string[]; declare const item: string; const has = seen.includes(item);',
      'name': 'includes() outside any loop — not flagged'
    },
    {
      'code': 'declare const ids: number[]; declare const text: string; for (const id of ids) { text.indexOf(String(id)); }',
      'name': 'String.prototype.indexOf() inside a loop — not flagged (not an array)'
    },
    {
      'code': 'declare const parts: string[]; for (const part of parts) { part.includes(\'[\'); }',
      'name': 'String.prototype.includes() inside a loop — not flagged (not an array)'
    },
    {
      'code': 'type EntryType = { readonly refs: readonly string[] }; declare const entries: EntryType[]; for (const entry of entries) { entry.refs.filter((r) => r.length > 0); }',
      'name': 'array scan on a for...of loop-local binding — not flagged (fresh collection each iteration)'
    },
    {
      'code': 'type EntryType = { readonly refs: readonly string[] }; declare const entries: EntryType[]; for (const outer of entries) { const inner = outer; inner.refs.every((r) => r.length > 0); }',
      'name': 'array scan on a const declared inside the loop body — not flagged (fresh collection each iteration)'
    }
  ],
  'invalid': [
    {
      'code': 'declare const records: { id: number }[]; declare const ids: number[]; for (const id of ids) { records.find((r) => r.id === id); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'find() inside for...of loop, receiver declared outside the loop — flagged'
    },
    {
      'code': 'declare const records: { id: number }[]; declare const ids: number[]; for (let i = 0; i < ids.length; i++) { records.filter((r) => r.id === ids[i]); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'filter() inside for loop — flagged'
    },
    {
      'code': 'declare const seen: number[]; declare const queue: number[]; while (queue.length > 0) { seen.indexOf(queue.pop()!); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'indexOf() inside while loop — flagged'
    },
    {
      'code': 'declare const seen: number[]; declare const x: number; do { seen.includes(x); } while (false);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'includes() inside do...while loop — flagged'
    },
    {
      'code': 'declare const arr: string[]; declare const obj: Record<string, number>; for (const k in obj) { arr.some((x) => x === k); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'some() inside for...in loop — flagged'
    },
    {
      'code': 'declare const arr: number[]; declare const ids: number[]; for (const id of ids) { arr.every((x) => x === id); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'every() inside for...of loop — flagged'
    },
    {
      'code': 'declare const arr: number[]; declare const ids: number[]; for (const id of ids) { [...arr].find((x) => x === id); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'spread-then-find inside loop — flagged (matches the call, not the receiver)'
    },
    {
      'code': 'declare const validUnits: readonly string[]; declare const config: Record<string, number>; for (const key of Object.keys(config)) { validUnits.includes(key as never); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'membership check against a module-scope-style array inside a loop — flagged'
    }
  ]
});
