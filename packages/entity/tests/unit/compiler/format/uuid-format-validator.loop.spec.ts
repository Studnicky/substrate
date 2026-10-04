import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UuidFormatValidator } from '../../../../src/compiler/format/UuidFormatValidator.js';

void describe('UuidFormatValidator', () => {
  void it('accepts a canonical lower-case UUID', () => {
    assert.equal(UuidFormatValidator.test('2eb8aa08-aa98-11ea-b4aa-73b441d16380'), true);
  });

  void it('accepts an all upper-case UUID', () => {
    assert.equal(UuidFormatValidator.test('2EB8AA08-AA98-11EA-B4AA-73B441D16380'), true);
  });

  void it('accepts a UUID whose variant nibble is undefined by RFC 4122', () => {
    assert.equal(UuidFormatValidator.test('2eb8aa08-aa98-11ea-f4aa-73b441d16380'), true);
  });

  void it('rejects a URN-prefixed UUID', () => {
    assert.equal(UuidFormatValidator.test('urn:uuid:2eb8aa08-aa98-11ea-b4aa-73b441d16380'), false);
  });

  void it('rejects a UUID with a bare unescaped bad character', () => {
    assert.equal(UuidFormatValidator.test('2eb8aa08-aa98-11ea-b4ga-73b441d16380'), false);
  });

  void it('rejects a UUID with a trailing newline', () => {
    assert.equal(UuidFormatValidator.test('2eb8aa08-aa98-11ea-b4aa-73b441d16380\n'), false);
  });
});
