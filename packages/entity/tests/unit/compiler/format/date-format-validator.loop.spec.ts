import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DateFormatValidator } from '../../../../src/compiler/format/DateFormatValidator.js';

void describe('DateFormatValidator', () => {
  void it('accepts a leap-year February 29', () => {
    assert.equal(DateFormatValidator.test('2020-02-29'), true);
  });

  void it('rejects a non-leap-year February 29', () => {
    assert.equal(DateFormatValidator.test('2021-02-29'), false);
  });

  void it('rejects February 30 even though the shape is well-formed', () => {
    assert.equal(DateFormatValidator.test('1998-02-30'), false);
  });

  void it('accepts a century year divisible by 400 as a leap year', () => {
    assert.equal(DateFormatValidator.test('0400-02-29'), true);
  });

  void it('rejects a century year divisible by 100 but not 400', () => {
    assert.equal(DateFormatValidator.test('1900-02-29'), false);
  });

  void it('rejects month 00', () => {
    assert.equal(DateFormatValidator.test('2024-00-15'), false);
  });

  void it('rejects day 00', () => {
    assert.equal(DateFormatValidator.test('2024-01-00'), false);
  });

  void it('rejects a non-padded month', () => {
    assert.equal(DateFormatValidator.test('1998-1-20'), false);
  });

  void it('rejects a year with a non-ASCII digit', () => {
    assert.equal(DateFormatValidator.test('২020-01-01'), false);
  });

  void it('rejects a year far outside the representable calendar range', () => {
    assert.equal(DateFormatValidator.test('2147483648-01-01'), false);
  });

  void it('accepts a four-digit year of 0001', () => {
    assert.equal(DateFormatValidator.test('0001-01-01'), true);
  });
});
