import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TimingInterface } from '../../../src/interfaces/TimingInterface.js';
import { TimingEvent } from '../../../src/modules/TimingEvent.js';
import { BrowserTiming } from '../../../src/browser/index.js';

void describe('BrowserTiming', () => {
  void it('satisfies the shared timing contract through the Performance API', () => {
    const timing: TimingInterface = BrowserTiming.create();
    timing.event(TimingEvent.create({ 'component': 'browser', 'operation': 'render' }));

    const events = timing.getEvents();

    assert.equal(events.has('browser.render'), true);
    assert.equal((events.get('durationMs') ?? -1) >= 0, true);
  });
});
