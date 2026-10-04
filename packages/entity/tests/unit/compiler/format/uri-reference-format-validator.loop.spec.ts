import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UriReferenceFormatValidator } from '../../../../src/compiler/format/UriReferenceFormatValidator.js';

void describe('UriReferenceFormatValidator', () => {
  void it('accepts the empty string (path-empty relative-ref)', () => {
    assert.equal(UriReferenceFormatValidator.test(''), true);
  });

  void it('accepts a network-path reference with an empty authority', () => {
    assert.equal(UriReferenceFormatValidator.test('//'), true);
  });

  void it('accepts a query-only reference', () => {
    assert.equal(UriReferenceFormatValidator.test('?query=1'), true);
  });

  void it('accepts a relative-path reference whose colon is preceded by a dot-segment', () => {
    assert.equal(UriReferenceFormatValidator.test('./this:that'), true);
  });

  void it('rejects a colon in the first segment of a relative-path reference', () => {
    assert.equal(UriReferenceFormatValidator.test('1:b'), false);
  });

  void it('rejects more than one at-sign in the authority', () => {
    assert.equal(UriReferenceFormatValidator.test('//a@b@example.com/'), false);
  });

  void it('rejects square brackets outside an authority', () => {
    assert.equal(UriReferenceFormatValidator.test('/[::1]'), false);
  });

  void it('rejects a non-numeric port in a network-path reference', () => {
    assert.equal(UriReferenceFormatValidator.test('//example.com:abc/p'), false);
  });

  void it('rejects unescaped non-ASCII characters', () => {
    assert.equal(UriReferenceFormatValidator.test('/foobar®.txt'), false);
  });

  void it('rejects a trailing line feed', () => {
    assert.equal(UriReferenceFormatValidator.test('/p\n'), false);
  });
});
