import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IriFormatValidator } from '../../../../src/compiler/format/IriFormatValidator.js';

void describe('IriFormatValidator', () => {
  void it('accepts non-ASCII host, query, and fragment characters', () => {
    assert.equal(IriFormatValidator.test('http://ƒøø.ßår/?∂éœ=πîx#πîüx'), true);
  });

  void it('accepts a supplementary-plane character in the path', () => {
    assert.equal(IriFormatValidator.test('http://ƒøø.ßår/\u{10300}'), true);
  });

  void it('accepts a supplementary-plane private-use character only inside the query', () => {
    assert.equal(IriFormatValidator.test('http://ƒøø.ßår/?q=\u{F0000}'), true);
  });

  void it('rejects a relative IRI reference (no scheme)', () => {
    assert.equal(IriFormatValidator.test('/abc'), false);
  });

  void it('rejects an IPv6 host without enclosing brackets', () => {
    assert.equal(IriFormatValidator.test('http://2001:0db8:85a3:0000:0000:8a2e:0370:7334'), false);
  });

  void it('rejects a leading zero in an embedded IPv4-in-IPv6 literal', () => {
    assert.equal(IriFormatValidator.test('http://[::ffff:192.168.0.01]'), false);
  });

  void it('accepts a no-authority URI with an absolute path', () => {
    assert.equal(IriFormatValidator.test('file:/etc/hosts'), true);
  });

  void it('rejects a trailing newline', () => {
    assert.equal(IriFormatValidator.test('http://ƒøø.ßår/\n'), false);
  });
});
