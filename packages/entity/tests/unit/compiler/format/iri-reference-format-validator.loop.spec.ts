import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IriReferenceFormatValidator } from '../../../../src/compiler/format/IriReferenceFormatValidator.js';

void describe('IriReferenceFormatValidator', () => {
  void it('accepts a relative reference with non-ASCII characters', () => {
    assert.equal(IriReferenceFormatValidator.test('/âππ'), true);
  });

  void it('accepts a protocol-relative reference with a compressed IPv6 host', () => {
    assert.equal(IriReferenceFormatValidator.test('//[2001:db8::1]/p'), true);
  });

  void it('rejects an embedded IPv4-in-IPv6 literal with a leading zero', () => {
    assert.equal(IriReferenceFormatValidator.test('//[::ffff:192.168.0.01]/p'), false);
  });

  void it('rejects a backslash in a fragment', () => {
    assert.equal(IriReferenceFormatValidator.test('#fräg\\mênt'), false);
  });

  void it('accepts a query-only reference with a supplementary private-use character', () => {
    assert.equal(IriReferenceFormatValidator.test('?q=\u{F0000}'), true);
  });

  void it('rejects an incomplete percent-encoding triplet', () => {
    assert.equal(IriReferenceFormatValidator.test('/%A'), false);
  });

  void it('rejects a trailing newline', () => {
    assert.equal(IriReferenceFormatValidator.test('/âππ\n'), false);
  });
});
