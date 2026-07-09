/** observedVisibleRange — override onRangeChange to collect a range-change trace. Run: npx tsx examples/observedVisibleRange.ts */

import assert from 'node:assert/strict';

// #region usage
import type { VisibleRangeType } from '../src/index.js';

import { VisibleRange } from '../src/index.js';

class TelemetryVisibleRange extends VisibleRange {
  readonly changes: VisibleRangeType[] = [];

  protected override onRangeChange(range: VisibleRangeType): void {
    console.log(`[visible-range] range changed to [${String(range.start)}, ${String(range.end)}]`);
    this.changes.push(range);
  }
}

// Fixed mode: every row is 40px tall, no DOM — the caller supplies scroll
// offset and viewport size from its own scroll-event/ResizeObserver wiring.
const rows = TelemetryVisibleRange.create({ 'count': 10_000, 'itemSize': 40, 'overscan': 2 }) as TelemetryVisibleRange;

rows.setViewportSize(400);
rows.setScrollOffset(0);
rows.getRange(); // fires — first call always "changes"

rows.setScrollOffset(0);
rows.getRange(); // no fire — identical range

rows.setScrollOffset(2000);
rows.getRange(); // fires — scrolled past the previous window

console.log('Fixed-mode ranges:', rows.changes);

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

assert.equal(rows.changes.length, 2);
assert.deepEqual(rows.changes[0], { 'end': 12, 'start': 0 });
assert.deepEqual(rows.changes[1], { 'end': 62, 'start': 48 });

assert.notDeepEqual(estimated, corrected);

console.log('observedVisibleRange: all assertions passed');
