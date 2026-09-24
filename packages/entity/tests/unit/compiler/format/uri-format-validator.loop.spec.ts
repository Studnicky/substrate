import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UriFormatValidator } from '../../../../src/compiler/format/UriFormatValidator.js';

void describe('UriFormatValidator', () => {
  void it('accepts an absolute URI with query and fragment', () => {
    assert.equal(UriFormatValidator.test('http://foo.bar/?baz=qux#quux'), true);
  });

  void it('accepts a URN (no authority, rootless path)', () => {
    assert.equal(UriFormatValidator.test('urn:oasis:names:specification:docbook:dtd:xml:4.1.2'), true);
  });

  void it('rejects a protocol-relative reference (no scheme)', () => {
    assert.equal(UriFormatValidator.test('//foo.bar/?baz=qux#quux'), false);
  });

  void it('rejects a relative path reference (no scheme)', () => {
    assert.equal(UriFormatValidator.test('/abc'), false);
  });

  void it('rejects a bare unescaped space', () => {
    assert.equal(UriFormatValidator.test('http:// shouldfail.com'), false);
  });

  void it('rejects an incomplete percent-encoding triplet', () => {
    assert.equal(UriFormatValidator.test('http://example.com/%A'), false);
  });

  void it('accepts an out-of-range dotted-quad as a structurally valid reg-name', () => {
    assert.equal(UriFormatValidator.test('http://999.999.999.999/'), true);
  });

  void it('rejects a leading zero in an embedded IPv4-in-IPv6 literal', () => {
    assert.equal(UriFormatValidator.test('http://[::ffff:01.2.3.4]'), false);
  });

  void it('accepts a compressed IPv6 host literal', () => {
    assert.equal(UriFormatValidator.test('http://[2001:db8::1]'), true);
  });

  void it('rejects a scheme starting with a digit', () => {
    assert.equal(UriFormatValidator.test('1http://example.com'), false);
  });

  void it('rejects a trailing newline', () => {
    assert.equal(UriFormatValidator.test('http://foo.bar/\n'), false);
  });
});
