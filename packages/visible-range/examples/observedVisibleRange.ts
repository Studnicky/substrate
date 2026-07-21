/** observedVisibleRange — override onRangeChange to collect a range-change trace. Run: npx tsx examples/observedVisibleRange.ts */

import assert from 'node:assert/strict';

// #region usage
import type { VisibleRangeEntity } from '../src/index.js';

import { VisibleRange } from '../src/index.js';

const fixedModeChanges: VisibleRangeEntity.Type[] = [];

class TelemetryVisibleRange extends VisibleRange {
  protected override onRangeChange(range: VisibleRangeEntity.Type): void {
    console.log(`[visible-range] range changed to [${String(range.start)}, ${String(range.end)}]`);
    fixedModeChanges.push(range);
  }
}

// Fixed mode: every row is 40px tall, no DOM — the caller supplies scroll
// offset and viewport size from its own scroll-event/ResizeObserver wiring.
const rows = TelemetryVisibleRange.create({ 'count': 10_000, 'itemSize': 40, 'overscan': 2 });

rows.setViewportSize(400);
rows.setScrollOffset(0);
rows.getRange(); // fires — first call always "changes"

rows.setScrollOffset(0);
rows.getRange(); // no fire — identical range

rows.setScrollOffset(2000);
rows.getRange(); // fires — scrolled past the previous window

console.log('Fixed-mode ranges:', fixedModeChanges);

// Variable mode: rows have an estimated size, corrected as real
// measurements arrive (e.g. after a row renders and reports its height).
const list = VisibleRange.create({
  'count': 500,
  'estimateSize': () => { const result = 32; return result; },
  'overscan': 1
});

list.setViewportSize(200);
list.setScrollOffset(320);

const estimated = list.getRange();

// A caller measuring actual rendered heights corrects the estimate.
for (let i = 0; i < 10; i++) {
  list.measureItem(i, 16);
}

const corrected = list.getRange();

console.log('Variable-mode range (estimated):', estimated);
console.log('Variable-mode range (after measureItem corrections):', corrected);
// #endregion usage

assert.equal(fixedModeChanges.length, 2);
assert.deepEqual(fixedModeChanges[0], { 'end': 12, 'start': 0 });
assert.deepEqual(fixedModeChanges[1], { 'end': 62, 'start': 48 });

assert.notDeepEqual(estimated, corrected);

console.log('observedVisibleRange: all assertions passed');
