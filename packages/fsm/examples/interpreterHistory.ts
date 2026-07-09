/** interpreterHistory — record and inspect an interpreter's own transitions. Run: npx tsx examples/interpreterHistory.ts */

import assert from 'node:assert/strict';

// #region usage
import type { FsmStepType } from '../src/index.js';

import { InterpreterHistory, StateMachine } from '../src/index.js';

// --- Domain types ---

type TrafficState =
  | { readonly 'variant': 'amber' }
  | { readonly 'variant': 'green' }
  | { readonly 'variant': 'red' };

type TrafficEvent = { readonly 'type': 'advance' };

class TrafficMachine extends StateMachine<TrafficState, TrafficEvent> {
  static make(): TrafficMachine { return new TrafficMachine(); }

  getInitialState(): TrafficState { return { 'variant': 'red' }; }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   { return { 'effects': [], 'state': { 'variant': 'green' } }; }
      if (state.variant === 'green') { return { 'effects': [], 'state': { 'variant': 'amber' } }; }
      if (state.variant === 'amber') { return { 'effects': [], 'state': { 'variant': 'red' } }; }
    }
    return { 'effects': [], 'state': state };
  }
}

// A bounded ring of the last 2 transitions — older records are dropped.
const history = InterpreterHistory.create({
  'capacity': 2,
  'machine': TrafficMachine.make(),
  'machineId': 'traffic-light'
});

history.start();
await history.send({ 'type': 'advance' }); // red -> green
await history.send({ 'type': 'advance' }); // green -> amber
await history.send({ 'type': 'advance' }); // amber -> red, evicts the red -> green record

console.log('Recorded transitions (oldest first):');
for (const record of history.history()) {
  console.log(`  ${record.from.variant} --[${record.event.type}]--> ${record.to.variant} @ ${record.timestamp}`);
}

history.stop();
// #endregion usage

const records = history.history();
assert.equal(records.length, 2, 'history is bounded to capacity');
assert.deepEqual(records[0]?.from, { 'variant': 'green' }, 'oldest surviving record is green -> amber');
assert.deepEqual(records[1]?.to, { 'variant': 'red' }, 'newest record is amber -> red');

console.log('\ninterpreterHistory: all assertions passed');
