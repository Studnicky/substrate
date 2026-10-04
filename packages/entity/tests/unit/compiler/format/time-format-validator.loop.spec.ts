import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TimeFormatValidator } from '../../../../src/compiler/format/TimeFormatValidator.js';

void describe('TimeFormatValidator', () => {
  void it('accepts a Zulu leap second at 23:59:60', () => {
    assert.equal(TimeFormatValidator.test('23:59:60Z'), true);
  });

  void it('rejects a leap second at the wrong hour', () => {
    assert.equal(TimeFormatValidator.test('22:59:60Z'), false);
  });

  void it('rejects a leap second at the wrong minute', () => {
    assert.equal(TimeFormatValidator.test('23:58:60Z'), false);
  });

  void it('accepts a leap second that rolls to 23:59 UTC under a positive offset', () => {
    assert.equal(TimeFormatValidator.test('01:29:60+01:30'), true);
  });

  void it('accepts a leap second that rolls to 23:59 UTC under a negative offset', () => {
    assert.equal(TimeFormatValidator.test('15:59:60-08:00'), true);
  });

  void it('rejects a leap second that offset-adjusts away from 23:59 UTC', () => {
    assert.equal(TimeFormatValidator.test('23:59:60+01:00'), false);
  });

  void it('rejects hour 24', () => {
    assert.equal(TimeFormatValidator.test('24:00:00Z'), false);
  });

  void it('rejects second 61', () => {
    assert.equal(TimeFormatValidator.test('00:00:61Z'), false);
  });

  void it('rejects an offset without minutes', () => {
    assert.equal(TimeFormatValidator.test('08:30:06+01'), false);
  });

  void it('rejects an offset numeric hour of 24', () => {
    assert.equal(TimeFormatValidator.test('01:02:03+24:00'), false);
  });

  void it('rejects a time with no offset at all', () => {
    assert.equal(TimeFormatValidator.test('12:00:00'), false);
  });

  void it('accepts a case-insensitive lowercase z', () => {
    assert.equal(TimeFormatValidator.test('08:30:06z'), true);
  });
});
