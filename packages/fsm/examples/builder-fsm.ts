/** builder-fsm — construct an EffectInterpreter via the fluent builder API. Run: npx tsx packages/fsm/examples/builder-fsm.ts */

import assert from 'node:assert/strict';

// #region usage
import type { EffectHandlerMapType, FsmStepType } from '../src/index.js';
import type { TrafficEffectEntity } from './entities/TrafficEffectEntity.js';
import type { TrafficEventEntity } from './entities/TrafficEventEntity.js';

import { EffectInterpreter, StateMachine } from '../src/index.js';

type TrafficState =
  | { readonly 'variant': 'red' }
  | { readonly 'variant': 'green' }
  | { readonly 'variant': 'amber' };

type TrafficEvent = TrafficEventEntity.Type;

type TrafficEffect = TrafficEffectEntity.Type;

class TrafficLight extends StateMachine<TrafficState, TrafficEvent, TrafficEffect> {
  static make(): TrafficLight { return new TrafficLight(); }

  getInitialState(): TrafficState {
    return { 'variant': 'red' };
  }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   { return { 'effects': [], 'state': { 'variant': 'green' } }; }
      if (state.variant === 'green') { return { 'effects': [{ 'tone': 'chime', 'variant': 'playSound' }], 'state': { 'variant': 'amber' } }; }
      if (state.variant === 'amber') { return { 'effects': [], 'state': { 'variant': 'red' } }; }
    }
    return { 'effects': [], 'state': state };
  }
}

class BuilderFsmDemo {
  static readonly soundsPlayed: string[] = [];
  static readonly history: string[] = [];

  static readonly handlers: EffectHandlerMapType<TrafficEffect> = {
    'playSound': (effect) => {
      BuilderFsmDemo.soundsPlayed.push(effect.tone);
      console.log(`  effect handler: playSound tone="${effect.tone}"`);
    }
  };

  static async run(): Promise<{ readonly 'finalVariant': TrafficState['variant']; readonly 'history': string[]; readonly 'soundsPlayed': string[] }> {
    const machine: TrafficLight = TrafficLight.make();

    const interpreter = EffectInterpreter.builder<TrafficState, TrafficEvent, TrafficEffect>()
      .withMachine(machine)
      .withHandlers(BuilderFsmDemo.handlers)
      .withOptions({ 'machineId': 'builder-demo' })
      .build();

    const unsubscribe = interpreter.subscribe((state) => { BuilderFsmDemo.history.push(state.variant); });

    interpreter.start();
    console.log('started — initial state:', interpreter.getState().variant);

    await interpreter.send({ 'type': 'advance' });
    console.log('after advance 1:', interpreter.getState().variant);

    await interpreter.send({ 'type': 'advance' });
    console.log('after advance 2:', interpreter.getState().variant);

    await interpreter.send({ 'type': 'advance' });
    console.log('after advance 3:', interpreter.getState().variant);

    console.log('State history:', BuilderFsmDemo.history);
    console.log('Sounds played:', BuilderFsmDemo.soundsPlayed);

    unsubscribe();
    interpreter.stop();

    return { 'finalVariant': interpreter.getState().variant, 'history': BuilderFsmDemo.history, 'soundsPlayed': BuilderFsmDemo.soundsPlayed };
  }
}

const results = await BuilderFsmDemo.run();
// #endregion usage

assert.equal(results.finalVariant, 'red');
assert.deepEqual(results.soundsPlayed, ['chime']);
assert.deepEqual(results.history, ['red', 'green', 'amber', 'red']);

console.log('builder-fsm: all assertions passed');
