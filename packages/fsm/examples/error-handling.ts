/** error-handling — ReducerThrewError wrapping, InterpreterNotStartedError, and InterpreterNotRunningError. Run: npx tsx examples/error-handling.ts */

import assert from 'node:assert/strict';

// #region usage
import type { FsmStepInterface } from '../src/index.js';
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

class BrokenMachine extends StateMachine<BrokenStateEntity.Type, BrokenEventEntity.Type> {
  static make(): BrokenMachine { return new BrokenMachine(); }

  getInitialState(): BrokenStateEntity.Type {
    return { 'variant': 'active' };
  }

  reduce(_state: BrokenStateEntity.Type, event: BrokenEventEntity.Type): FsmStepInterface<BrokenStateEntity.Type> {
    if (event.type === 'boom') { throw new Error('reducer exploded'); }
    return { 'effects': [], 'state': _state };
  }
}

const broken: BrokenMachine = BrokenMachine.make();
const initialState: BrokenStateEntity.Type = { 'variant': 'active' };

// StateMachine.transition wraps reducer throws in ReducerThrewError
assert.throws(
  () => { broken.transition(initialState, { 'type': 'boom' }); },
  ReducerThrewError
);

console.log('ReducerThrewError thrown and caught');

// --- InterpreterNotStartedError ---

class SimpleMachine extends StateMachine<SimpleStateEntity.Type, SimpleEventEntity.Type> {
  static make(): SimpleMachine { return new SimpleMachine(); }
  getInitialState(): SimpleStateEntity.Type { return { 'variant': 'idle' }; }
  reduce(state: SimpleStateEntity.Type): FsmStepInterface<SimpleStateEntity.Type> { return { 'effects': [], 'state': state }; }
}

const notStarted: EffectInterpreter<SimpleStateEntity.Type, SimpleEventEntity.Type> = EffectInterpreter.create({ 'machine': SimpleMachine.make() });

// getState before start() throws InterpreterNotStartedError
assert.throws(
  () => { notStarted.getState(); },
  InterpreterNotStartedError
);

console.log('InterpreterNotStartedError thrown and caught');

// --- InterpreterNotRunningError ---

const stopped: EffectInterpreter<SimpleStateEntity.Type, SimpleEventEntity.Type> = EffectInterpreter.create({ 'machine': SimpleMachine.make() });
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
