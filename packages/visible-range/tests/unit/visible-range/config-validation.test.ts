/**
 * VisibleRange Config Validation Unit Tests
 *
 * Verifies VisibleRange.create() rejects a config that supplies neither
 * `itemSize` nor `estimateSize`, and rejects a config that supplies both
 * (ambiguous mode selection).
 */

import { throws } from 'node:assert/strict';
import { it } from 'node:test';

import { VisibleRange, VisibleRangeError } from '../../../src/index.js';

it('throws a VisibleRangeError when neither itemSize nor estimateSize is supplied', () => {
  throws(() => {
    VisibleRange.create({ 'count': 100 });
  }, VisibleRangeError);
});

it('throws a VisibleRangeError when both itemSize and estimateSize are supplied', () => {
  throws(() => {
    VisibleRange.create({ 'count': 100, 'itemSize': 40, 'estimateSize': () => 40 });
  }, VisibleRangeError);
});
