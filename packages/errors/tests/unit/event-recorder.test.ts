import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventRecorder } from '../../src/index.js';

interface RecordedEventInterface {
  'shape': string;
  'nested': { 'value': number };
}

void describe('EventRecorder', () => {
  void it('detaches recorded events and every public projection', () => {
    const recorder = new EventRecorder<RecordedEventInterface>();
    const source = { 'shape': 'request', 'nested': { 'value': 1 } };

    recorder.record(source, 'request');
    source.nested.value = 2;

    const firstProjection = recorder.events;
    strictEqual(firstProjection.length, 1);
    deepStrictEqual(firstProjection[0], { 'shape': 'request', 'nested': { 'value': 1 } });

    const firstEvent = firstProjection[0];
    if (firstEvent !== undefined) {
      firstEvent.nested.value = 3;
    }

    deepStrictEqual(recorder.events[0], { 'shape': 'request', 'nested': { 'value': 1 } });
  });
});
