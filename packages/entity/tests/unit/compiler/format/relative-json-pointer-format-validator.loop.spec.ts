import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RelativeJsonPointerFormatValidator } from '../../../../src/compiler/format/RelativeJsonPointerFormatValidator.js';

void describe('RelativeJsonPointerFormatValidator', () => {
  void it('accepts a bare upwards level count', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('1'), true);
  });

  void it('accepts a level count followed by a json-pointer suffix', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('2/0/baz/1/zip'), true);
  });

  void it('accepts a level count followed by the index-name octothorpe', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('0#'), true);
  });

  void it('accepts a multi-digit prefix with no leading-zero violation', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('120/foo/bar'), true);
  });

  void it('rejects a plain json-pointer with no integer prefix', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('/foo/bar'), false);
  });

  void it('rejects a negative prefix', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('-1/foo/bar'), false);
  });

  void it('rejects a leading zero followed by another digit', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('01/a'), false);
  });

  void it('rejects an octothorpe followed by a json-pointer suffix', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('1#/foo/bar'), false);
  });

  void it('rejects the empty string', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test(''), false);
  });

  void it('accepts empty reference tokens in the json-pointer part', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('0//'), true);
  });

  void it('rejects a trailing newline after the integer', () => {
    assert.equal(RelativeJsonPointerFormatValidator.test('1\n'), false);
  });
});
