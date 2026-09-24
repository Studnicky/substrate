import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DateTimeFormatValidator } from '../../../../src/compiler/format/DateTimeFormatValidator.js';

void describe('DateTimeFormatValidator', () => {
  void it('accepts a valid date-time with a fractional second and Zulu offset', () => {
    assert.equal(DateTimeFormatValidator.test('1963-06-19T08:30:06.283185Z'), true);
  });

  void it('accepts a case-insensitive T and Z', () => {
    assert.equal(DateTimeFormatValidator.test('1963-06-19t08:30:06.283185z'), true);
  });

  void it('rejects an invalid calendar day even when the time is well-formed', () => {
    assert.equal(DateTimeFormatValidator.test('1990-02-31T15:59:59.123-08:00'), false);
  });

  void it('rejects an invalid clock time even when the date is well-formed', () => {
    assert.equal(DateTimeFormatValidator.test('1990-12-31T24:00:00Z'), false);
  });

  void it('accepts a leap second on the date it is eligible', () => {
    assert.equal(DateTimeFormatValidator.test('1998-12-31T23:59:60Z'), true);
  });

  void it('rejects second 61 past a leap second', () => {
    assert.equal(DateTimeFormatValidator.test('1998-12-31T23:59:61Z'), false);
  });

  void it('rejects trailing content after the offset', () => {
    assert.equal(DateTimeFormatValidator.test('1985-04-12T23:20:50Ztail'), false);
  });

  void it('rejects a date-time missing the seconds component', () => {
    assert.equal(DateTimeFormatValidator.test('1985-04-12T23:20Z'), false);
  });

  void it('rejects a February 29 on a century year not divisible by 400', () => {
    assert.equal(DateTimeFormatValidator.test('2100-02-29T00:00:00Z'), false);
  });
});
