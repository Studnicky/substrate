/** error-handling — ReducerThrewError wrapping, InterpreterNotStartedError, and InterpreterNotRunningError. Run: npx tsx examples/error-handling.ts */

import assert from 'node:assert/strict';

// #region usage
import type { FsmStepType } from '../src/index.js';
import type { BrokenEventEntity } from './entities/BrokenEventEntity.js';
import type { BrokenStateEntity } from './entities/BrokenStateEntity.js';
import type { SimpleEventEntity } from './entities/SimpleEventEntity.js';
import type { SimpleStateEntity } from './entities/SimpleStateEntity.js';

import {
  EffectInterpreter,
  InterpreterNotRunningError,
  InterpreterNotStartedError,
  ReducerThrewError,
  StateMachine
} from '../src/index.js';

// --- ReducerThrewError ---

type BrokenState = BrokenStateEntity.Type;
type BrokenEvent = BrokenEventEntity.Type;

class BrokenMachine extends StateMachine<BrokenState, BrokenEvent> {
  static make(): BrokenMachine { return new BrokenMachine(); }

  getInitialState(): BrokenState {
    return { 'variant': 'active' };
  }

  reduce(_state: BrokenState, event: BrokenEvent): FsmStepType<BrokenState> {
    if (event.type === 'boom') { throw new Error('reducer exploded'); }
    return { 'effects': [], 'state': _state };
  }
}

const broken: BrokenMachine = BrokenMachine.make();
const initialState: BrokenState = { 'variant': 'active' };

// StateMachine.transition wraps reducer throws in ReducerThrewError
assert.throws(
  () => { broken.transition(initialState, { 'type': 'boom' }); },
  ReducerThrewError
);

console.log('ReducerThrewError thrown and caught');

// --- InterpreterNotStartedError ---

type SimpleState = SimpleStateEntity.Type;
type SimpleEvent = SimpleEventEntity.Type;

class SimpleMachine extends StateMachine<SimpleState, SimpleEvent> {
  static make(): SimpleMachine { return new SimpleMachine(); }
  getInitialState(): SimpleState { return { 'variant': 'idle' }; }
  reduce(state: SimpleState): FsmStepType<SimpleState> { return { 'effects': [], 'state': state }; }
}

const notStarted: EffectInterpreter<SimpleState, SimpleEvent> = EffectInterpreter.create({ 'machine': SimpleMachine.make() });

// getState before start() throws InterpreterNotStartedError
assert.throws(
  () => { notStarted.getState(); },
  InterpreterNotStartedError
);

console.log('InterpreterNotStartedError thrown and caught');

// --- InterpreterNotRunningError ---

const stopped: EffectInterpreter<SimpleState, SimpleEvent> = EffectInterpreter.create({ 'machine': SimpleMachine.make() });
stopped.start();
stopped.stop();

// send after stop() throws InterpreterNotRunningError
await assert.rejects(
  async () => { await stopped.send({ 'type': 'noop' }); },
  InterpreterNotRunningError
);

console.log('InterpreterNotRunningError thrown and caught');
// #endregion usage

console.log('error-handling: all assertions passed');
