import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UriTemplateFormatValidator } from '../../../../src/compiler/format/UriTemplateFormatValidator.js';

void describe('UriTemplateFormatValidator', () => {
  void it('accepts the empty string', () => {
    assert.equal(UriTemplateFormatValidator.test(''), true);
  });

  void it('accepts a prefix modifier and a bare variable expression', () => {
    assert.equal(UriTemplateFormatValidator.test('http://example.com/dictionary/{term:1}/{term}'), true);
  });

  void it('rejects an unclosed expression', () => {
    assert.equal(UriTemplateFormatValidator.test('http://example.com/dictionary/{term:1}/{term'), false);
  });

  void it('rejects an empty expression', () => {
    assert.equal(UriTemplateFormatValidator.test('{}'), false);
  });

  void it('rejects an empty varspec inside a variable list', () => {
    assert.equal(UriTemplateFormatValidator.test('{a,,b}'), false);
  });

  void it('rejects a zero prefix length', () => {
    assert.equal(UriTemplateFormatValidator.test('{v:0}'), false);
  });

  void it('rejects a five-digit prefix length', () => {
    assert.equal(UriTemplateFormatValidator.test('{v:10000}'), false);
  });

  void it('rejects combined prefix and explode modifiers', () => {
    assert.equal(UriTemplateFormatValidator.test('{var:1*}'), false);
  });

  void it('rejects a double dot in a variable name', () => {
    assert.equal(UriTemplateFormatValidator.test('{a..b}'), false);
  });

  void it('accepts every RFC 6570 operator', () => {
    const operators = ['+', '#', '.', '/', ';', '?', '&'];
    for (let index = 0; index < operators.length; index += 1) {
      assert.equal(UriTemplateFormatValidator.test(`{${operators[index]}var}`), true);
    }
  });

  void it('rejects a lone percent sign in a literal', () => {
    assert.equal(UriTemplateFormatValidator.test('a%'), false);
  });

  void it('rejects a space in a literal', () => {
    assert.equal(UriTemplateFormatValidator.test('a b'), false);
  });

  void it('accepts a supplementary-plane private-use character in a literal', () => {
    assert.equal(UriTemplateFormatValidator.test('a\u{F0000}b'), true);
  });

  void it('rejects an unmatched closing brace', () => {
    assert.equal(UriTemplateFormatValidator.test('foo}bar'), false);
  });
});
