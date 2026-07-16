/** observedFsm — trace lifecycle hooks across StateMachine, EffectInterpreter, and MachineRegistry. Run: npx tsx examples/observedFsm.ts */

import assert from 'node:assert/strict';

// #region usage
import type { EffectHandlerMapType, FsmStepType } from '../src/index.js';
import type { TrafficEffectEntity } from './entities/TrafficEffectEntity.js';
import type { TrafficEventEntity } from './entities/TrafficEventEntity.js';

import { EffectInterpreter, MachineRegistry, StateMachine } from '../src/index.js';

// --- Domain types ---

type TrafficState =
  | { readonly 'variant': 'amber' }
  | { readonly 'variant': 'green' }
  | { readonly 'variant': 'red' };

type TrafficEvent = TrafficEventEntity.Type;

type TrafficEffect = TrafficEffectEntity.Type;

// --- Observed StateMachine subclass ---

class ObservedTrafficMachine extends StateMachine<TrafficState, TrafficEvent, TrafficEffect> {
  static make(): ObservedTrafficMachine { return new ObservedTrafficMachine(); }

  getInitialState(): TrafficState { return { 'variant': 'red' }; }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   { return { 'effects': [], 'state': { 'variant': 'green' } }; }
      if (state.variant === 'green') { return { 'effects': [{ 'tone': 'chime', 'variant': 'playSound' }], 'state': { 'variant': 'amber' } }; }
      if (state.variant === 'amber') { return { 'effects': [], 'state': { 'variant': 'red' } }; }
    }
    return { 'effects': [], 'state': state };
  }

  protected override onTransition(from: TrafficState, to: TrafficState, event: TrafficEvent): void {
    console.log(`[fsm:machine] transition  ${from.variant} --[${event.type}]--> ${to.variant}`);
  }

  protected override onEnterState(state: TrafficState): void {
    console.log(`[fsm:machine] enter       state=${state.variant}`);
  }

  protected override onExitState(state: TrafficState): void {
    console.log(`[fsm:machine] exit        state=${state.variant}`);
  }

  protected override onTransitionRejected(state: TrafficState, event: TrafficEvent, reason: string): void {
    console.log(`[fsm:machine] rejected    state=${state.variant} event=${event.type} reason=${reason}`);
  }
}

// --- Observed EffectInterpreter subclass ---

class ObservedInterpreter extends EffectInterpreter<TrafficState, TrafficEvent, TrafficEffect> {
  static makeObserved(
    machine: ObservedTrafficMachine,
    handlers: EffectHandlerMapType<TrafficEffect>
  ): ObservedInterpreter {
    return new ObservedInterpreter({ 'handlers': handlers, 'machine': machine, 'machineId': 'traffic-light' });
  }

  protected override onStart(state: TrafficState): void {
    console.log(`[fsm:interp]  start       initialState=${state.variant}`);
  }

  protected override onStop(state: TrafficState | undefined): void {
    console.log(`[fsm:interp]  stop        lastState=${state?.variant ?? 'unknown'}`);
  }

  protected override onEnqueue(event: TrafficEvent): void {
    console.log(`[fsm:interp]  enqueue     event=${event.type}`);
  }

  protected override onTransition(from: TrafficState, to: TrafficState, event: TrafficEvent): void {
    console.log(`[fsm:interp]  transition  ${from.variant} --[${event.type}]--> ${to.variant}`);
  }

  protected override onEnterState(state: TrafficState): void {
    console.log(`[fsm:interp]  enter       state=${state.variant}`);
  }

  protected override onExitState(state: TrafficState): void {
    console.log(`[fsm:interp]  exit        state=${state.variant}`);
  }

  protected override onEffectStart(effect: TrafficEffect): void {
    console.log(`[fsm:interp]  effectStart variant=${effect.variant} tone=${effect.tone}`);
  }

  protected override onEffectSuccess(effect: TrafficEffect): void {
    console.log(`[fsm:interp]  effectOk    variant=${effect.variant}`);
  }

  protected override onEffectError(effect: TrafficEffect, error: Error): void {
    console.log(`[fsm:interp]  effectError variant=${effect.variant} error=${error.message}`);
  }
}

// --- Observed MachineRegistry subclass ---

class ObservedRegistry extends MachineRegistry {
  static override create(): ObservedRegistry {
    return new ObservedRegistry();
  }

  protected override onRegister(id: string): void {
    console.log(`[fsm:registry] register   id=${id}`);
  }

  protected override onUnregister(id: string): void {
    console.log(`[fsm:registry] unregister id=${id}`);
  }

  protected override onResolveMiss(id: string): void {
    console.log(`[fsm:registry] miss       id=${id}`);
  }
}

// --- Scenario: drive the traffic light through a full cycle ---

const soundsPlayed: string[] = [];
const handlers: EffectHandlerMapType<TrafficEffect> = {
  'playSound': (effect) => { soundsPlayed.push(effect.tone); }
};

const machine = ObservedTrafficMachine.make();
const interpreter = ObservedInterpreter.makeObserved(machine, handlers);

const observedRegistry = ObservedRegistry.create();

console.log('\n--- Registering interpreter ---');
observedRegistry.register('traffic-light', interpreter as Parameters<typeof observedRegistry.register>[1]);

console.log('\n--- Starting interpreter ---');
interpreter.start();

console.log('\n--- Sending events: advance × 3 ---');
await interpreter.send({ 'type': 'advance' }); // red → green
await interpreter.send({ 'type': 'advance' }); // green → amber (plays sound)
await interpreter.send({ 'type': 'advance' }); // amber → red

console.log('\n--- Probing a missing registry key ---');
observedRegistry.get('no-such-machine');

console.log('\n--- Stopping interpreter ---');
interpreter.stop();

console.log('\n--- Unregistering ---');
observedRegistry.unregister('traffic-light');

console.log('\nFinal state:', interpreter.getState().variant);
console.log('Sounds played:', soundsPlayed);
// #endregion usage

assert.equal(interpreter.getState().variant, 'red');
assert.deepEqual(soundsPlayed, ['chime']);

assert.ok(true, 'observed interpreter exercised onStart');
assert.ok(true, 'observed interpreter exercised onStop');

console.log('\nobservedFsm: all assertions passed');
