import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdnHostnameFormatValidator } from '../../../../src/compiler/format/IdnHostnameFormatValidator.js';

void describe('IdnHostnameFormatValidator', () => {
  void it('accepts a valid internationalized host name (example.test in Hangul)', () => {
    assert.equal(IdnHostnameFormatValidator.test('실례.테스트'), true);
  });

  void it('maps fullwidth digits to ASCII digits', () => {
    assert.equal(IdnHostnameFormatValidator.test('１２３'), true);
  });

  void it('accepts a non-NFC label as valid after NFC normalization', () => {
    assert.equal(IdnHostnameFormatValidator.test('café.com'), true);
  });

  void it('splits on all four UTS-46 dot variants', () => {
    assert.equal(IdnHostnameFormatValidator.test('a。b'), true);
    assert.equal(IdnHostnameFormatValidator.test('a．b'), true);
    assert.equal(IdnHostnameFormatValidator.test('a｡b'), true);
  });

  void it('rejects an empty label between two separators', () => {
    assert.equal(IdnHostnameFormatValidator.test('a..b'), false);
  });

  void it('rejects non-canonical Punycode that does not re-encode to itself', () => {
    assert.equal(IdnHostnameFormatValidator.test('xn---9uc'), false);
  });

  void it('rejects an A-label that decodes to only ASCII', () => {
    assert.equal(IdnHostnameFormatValidator.test('xn--example-'), false);
  });

  void it('rejects a Bidi domain name with a digit-first label', () => {
    assert.equal(IdnHostnameFormatValidator.test('0a.א'), false);
  });

  void it('accepts a zero-width non-joiner preceded by a Virama', () => {
    assert.equal(IdnHostnameFormatValidator.test('क्‌ष'), true);
  });

  void it('rejects a zero-width joiner not preceded by a Virama', () => {
    assert.equal(IdnHostnameFormatValidator.test('क‍ष'), false);
  });

  void it('rejects a label mixing Arabic-Indic and Extended Arabic-Indic digits', () => {
    assert.equal(IdnHostnameFormatValidator.test('ب٠۰'), false);
  });

  void it('rejects a single label over 63 characters', () => {
    assert.equal(IdnHostnameFormatValidator.test('a'.repeat(64)), false);
  });
});
