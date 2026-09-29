/** observedVisibleRange — override onRangeChange to collect a range-change trace. Run: npx tsx examples/observedVisibleRange.ts */

import assert from 'node:assert/strict';

// #region usage
import type { VisibleRangeEntity } from '../src/entities/index.js';

import { VisibleRange } from '../src/index.js';

const fixedModeChanges: VisibleRangeEntity.Type[] = [];

class TelemetryVisibleRange extends VisibleRange {
  protected override onRangeChange(range: VisibleRangeEntity.Type): void {
    console.log(`[visible-range] range changed to [${String(range.start)}, ${String(range.end)}]`);
    fixedModeChanges.push(range);
  }
}

// Northstar Books renders a virtual catalogue: every compact title row is 40px tall.
// The catalogue view supplies scroll offset and viewport size from its event wiring.
const rows = TelemetryVisibleRange.create({ 'count': 10_000, 'itemSize': 40, 'overscan': 2 });

rows.setViewportSize(400);
rows.setScrollOffset(0);
rows.getRange(); // fires — first call always "changes"

rows.setScrollOffset(0);
rows.getRange(); // no fire — identical range

rows.setScrollOffset(2000);
rows.getRange(); // fires — scrolled past the previous window

console.log('Northstar Books catalogue viewport ranges:', fixedModeChanges);

// Search-result cards use estimated heights, corrected after catalogue cards render.
const list = VisibleRange.create(
  { 'count': 500, 'overscan': 1 },
  {
    'estimateSize': () => {
      const estimatedItemSize = 16 * 2;
      return estimatedItemSize;
    }
  }
);

list.setViewportSize(200);
list.setScrollOffset(320);

const estimated = list.getRange();

// A caller measuring actual rendered heights corrects the estimate.
for (let i = 0; i < 10; i++) {
  list.measureItem(i, 16);
}

const corrected = list.getRange();

console.log('Catalogue card range (estimated):', estimated);
console.log('Catalogue card range (after measurement):', corrected);
// #endregion usage

assert.equal(fixedModeChanges.length, 2);
assert.deepEqual(fixedModeChanges[0], { 'end': 12, 'start': 0 });
assert.deepEqual(fixedModeChanges[1], { 'end': 62, 'start': 48 });

assert.notDeepEqual(estimated, corrected);

console.log('observedVisibleRange: all assertions passed');
