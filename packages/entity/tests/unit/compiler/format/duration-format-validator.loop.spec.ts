import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DurationFormatValidator } from '../../../../src/compiler/format/DurationFormatValidator.js';

void describe('DurationFormatValidator', () => {
  void it('rejects the bare designator P with no elements', () => {
    assert.equal(DurationFormatValidator.test('P'), false);
  });

  void it('rejects a trailing T with no time components', () => {
    assert.equal(DurationFormatValidator.test('P1YT'), false);
  });

  void it('rejects T alone', () => {
    assert.equal(DurationFormatValidator.test('PT'), false);
  });

  void it('distinguishes one month from one minute', () => {
    assert.equal(DurationFormatValidator.test('P1M'), true);
    assert.equal(DurationFormatValidator.test('PT1M'), true);
  });

  void it('rejects a week designator combined with other units', () => {
    assert.equal(DurationFormatValidator.test('P1Y2W'), false);
  });

  void it('rejects a week designator combined with a time component', () => {
    assert.equal(DurationFormatValidator.test('P1WT1H'), false);
  });

  void it('accepts a bare week designator', () => {
    assert.equal(DurationFormatValidator.test('P2W'), true);
  });

  void it('rejects years and days without an intervening month', () => {
    assert.equal(DurationFormatValidator.test('P1Y2D'), false);
  });

  void it('accepts months and days without years', () => {
    assert.equal(DurationFormatValidator.test('P1M2D'), true);
  });

  void it('rejects elements out of designator order', () => {
    assert.equal(DurationFormatValidator.test('P2D1Y'), false);
  });

  void it('rejects a time element placed in the date position', () => {
    assert.equal(DurationFormatValidator.test('P2S'), false);
  });

  void it('rejects fractional seconds', () => {
    assert.equal(DurationFormatValidator.test('PT0.5S'), false);
  });

  void it('rejects a leading sign', () => {
    assert.equal(DurationFormatValidator.test('-P1D'), false);
  });

  void it('accepts a many-digit component', () => {
    assert.equal(
      DurationFormatValidator.test('P999999999999999999999999999999999999999999999999999999999999999999999999999999D'),
      true
    );
  });
});
