import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JsonPointerFormatValidator } from '../../../../src/compiler/format/JsonPointerFormatValidator.js';

void describe('JsonPointerFormatValidator', () => {
  void it('accepts the empty pointer', () => {
    assert.equal(JsonPointerFormatValidator.test(''), true);
  });

  void it('accepts escaped tilde and slash tokens', () => {
    assert.equal(JsonPointerFormatValidator.test('/foo/bar~0/baz~1/%a'), true);
  });

  void it('accepts a pointer with an empty segment', () => {
    assert.equal(JsonPointerFormatValidator.test('/foo//bar'), true);
  });

  void it('rejects a bare unescaped tilde', () => {
    assert.equal(JsonPointerFormatValidator.test('/foo/bar~'), false);
  });

  void it('rejects a URI fragment identifier form', () => {
    assert.equal(JsonPointerFormatValidator.test('#/foo'), false);
  });

  void it('rejects a non-empty string that does not start with a slash', () => {
    assert.equal(JsonPointerFormatValidator.test('a/a'), false);
  });
});
