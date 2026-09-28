import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EmailFormatValidator } from '../../../../src/compiler/format/EmailFormatValidator.js';

void describe('EmailFormatValidator', () => {
  void it('accepts a plain dot-atom address', () => {
    assert.equal(EmailFormatValidator.test('joe.bloggs@example.com'), true);
  });

  void it('accepts a quoted local part containing a space', () => {
    assert.equal(EmailFormatValidator.test('"joe bloggs"@example.com'), true);
  });

  void it('accepts a quoted local part with consecutive dots', () => {
    assert.equal(EmailFormatValidator.test('"joe..bloggs"@example.com'), true);
  });

  void it('rejects an unquoted local part with consecutive dots', () => {
    assert.equal(EmailFormatValidator.test('te..st@example.com'), false);
  });

  void it('rejects a leading dot in an unquoted local part', () => {
    assert.equal(EmailFormatValidator.test('.test@example.com'), false);
  });

  void it('rejects a trailing dot in an unquoted local part', () => {
    assert.equal(EmailFormatValidator.test('test.@example.com'), false);
  });

  void it('accepts an escaped quoted pair in a quoted local part', () => {
    assert.equal(EmailFormatValidator.test('"\\a"@iana.org'), true);
  });

  void it('rejects a non-ASCII character inside a quoted pair', () => {
    assert.equal(EmailFormatValidator.test('"test\\©"@iana.org'), false);
  });

  void it('accepts an IPv4 address-literal domain', () => {
    assert.equal(EmailFormatValidator.test('joe.bloggs@[127.0.0.1]'), true);
  });

  void it('rejects an out-of-range IPv4 address-literal domain', () => {
    assert.equal(EmailFormatValidator.test('joe.bloggs@[127.0.0.300]'), false);
  });

  void it('accepts a lowercase IPv6 address-literal tag', () => {
    assert.equal(EmailFormatValidator.test('a@[ipv6:::1]'), true);
  });

  void it('rejects a domain label starting with a hyphen', () => {
    assert.equal(EmailFormatValidator.test('test@-iana.org'), false);
  });

  void it('rejects a domain label ending with a hyphen', () => {
    assert.equal(EmailFormatValidator.test('test@iana-.com'), false);
  });

  void it('rejects a non-ASCII character in the local part', () => {
    assert.equal(EmailFormatValidator.test('aé@iana.org'), false);
  });

  void it('rejects a non-ASCII character in the domain', () => {
    assert.equal(EmailFormatValidator.test('a@é.org'), false);
  });

  void it('rejects a fullwidth commercial at as a separator', () => {
    assert.equal(EmailFormatValidator.test('a＠iana.org'), false);
  });

  void it('accepts a local part at the 64-octet limit', () => {
    assert.equal(EmailFormatValidator.test(`${'a'.repeat(64)}@example.com`), true);
  });
});
