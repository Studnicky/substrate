import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RegexFormatValidator } from '../../../../src/compiler/format/RegexFormatValidator.js';

void describe('RegexFormatValidator', () => {
  void it('accepts a valid ECMA-262 pattern', () => {
    assert.equal(RegexFormatValidator.test('([abc])+\\s+$'), true);
  });

  void it('rejects unclosed parens', () => {
    assert.equal(RegexFormatValidator.test('^(abc]'), false);
  });

  void it('rejects a non-ECMA-262 control escape', () => {
    assert.equal(RegexFormatValidator.test('\\a'), false);
  });

  void it('rejects a Python-style named group', () => {
    assert.equal(RegexFormatValidator.test('(?P<name>x)'), false);
  });

  void it('rejects an inline global flag group', () => {
    assert.equal(RegexFormatValidator.test('(?i)abc'), false);
  });

  void it('accepts an ECMA-262 named group and backreference', () => {
    assert.equal(RegexFormatValidator.test('(?<n>a)\\k<n>'), true);
  });

  void it('accepts a variable-width lookbehind', () => {
    assert.equal(RegexFormatValidator.test('(?<=a+)b'), true);
  });

  void it('accepts an empty and negated-empty character class', () => {
    assert.equal(RegexFormatValidator.test('[]'), true);
    assert.equal(RegexFormatValidator.test('[^]'), true);
  });
});
