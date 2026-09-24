import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdnEmailFormatValidator } from '../../../../src/compiler/format/IdnEmailFormatValidator.js';

void describe('IdnEmailFormatValidator', () => {
  void it('accepts a fully non-ASCII address', () => {
    assert.equal(IdnEmailFormatValidator.test('실례@실례.테스트'), true);
  });

  void it('accepts a non-ASCII local part with an ASCII domain', () => {
    assert.equal(IdnEmailFormatValidator.test('δοκιμή@example.com'), true);
  });

  void it('accepts a non-ASCII quoted local part', () => {
    assert.equal(IdnEmailFormatValidator.test('"δοκιμή"@example.com'), true);
  });

  void it('accepts a domain label that is not in Unicode NFC', () => {
    assert.equal(IdnEmailFormatValidator.test('user@café.com'), true);
  });

  void it('accepts a C1 control character in the local part', () => {
    assert.equal(IdnEmailFormatValidator.test('\u0085@example.com'), true);
  });

  void it('accepts a supplementary-plane character in the local part', () => {
    assert.equal(IdnEmailFormatValidator.test('𝕏@example.com'), true);
  });

  void it('rejects a fullwidth commercial at as a local-part separator', () => {
    assert.equal(IdnEmailFormatValidator.test('user＠example.com'), false);
  });

  void it('rejects a non-ASCII domain label starting with a hyphen', () => {
    assert.equal(IdnEmailFormatValidator.test('δοκιμή@-example.com'), false);
  });

  void it('rejects a non-ASCII domain label ending with a hyphen', () => {
    assert.equal(IdnEmailFormatValidator.test('δοκιμή@example-.com'), false);
  });

  void it('requires a domain', () => {
    assert.equal(IdnEmailFormatValidator.test('δοκιμή@'), false);
  });
});
