/** traffic-light — basic state transitions with an EffectInterpreter. Run: npx tsx examples/traffic-light.ts */

import assert from 'node:assert/strict';

// #region usage
import type { EffectHandlerInterface, FsmStepInterface } from '../src/index.js';
import type { TrafficEffectEntity } from './entities/TrafficEffectEntity.js';
import type { TrafficEventEntity } from './entities/TrafficEventEntity.js';
import type { TrafficStateEntity } from './entities/TrafficStateEntity.js';

import { EffectInterpreter, StateMachine } from '../src/index.js';

class TrafficLight extends StateMachine<TrafficStateEntity.Type, TrafficEventEntity.Type, TrafficEffectEntity.Type> {
  static make(): TrafficLight { return new TrafficLight(); }

  getInitialState(): TrafficStateEntity.Type {
    return { 'variant': 'red' };
  }

  reduce(
    state: TrafficStateEntity.Type,
    event: TrafficEventEntity.Type
  ): FsmStepInterface<TrafficStateEntity.Type, TrafficEffectEntity.Type> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   {return { 'effects': [], 'state': { 'variant': 'green' } };}
      if (state.variant === 'green') {return { 'effects': [{ 'tone': 'chime', 'variant': 'playSound' }], 'state': { 'variant': 'amber' } };}
      if (state.variant === 'amber') {return { 'effects': [], 'state': { 'variant': 'red' } };}
    }
    return { 'effects': [], 'state': state };
  }
}

class TrafficLightDemo {
  static readonly soundsPlayed: string[] = [];
  static readonly history: string[] = [];

  static readonly handler: EffectHandlerInterface<TrafficEffectEntity.Type> = (effect) => {
    TrafficLightDemo.soundsPlayed.push(effect.tone);
  };

  static async run(): Promise<{ readonly 'finalVariant': TrafficStateEntity.Type['variant']; readonly 'history': string[]; readonly 'soundsPlayed': string[] }> {
    const machine: TrafficLight = TrafficLight.make();
    const interpreter: EffectInterpreter<TrafficStateEntity.Type, TrafficEventEntity.Type, TrafficEffectEntity.Type> = EffectInterpreter.create({
      'handler': TrafficLightDemo.handler,
      'machine': machine,
      'machineId': 'test-light'
    });

    const unsubscribe = interpreter.subscribe((state) => { TrafficLightDemo.history.push(state.variant); });

    interpreter.start();

    await interpreter.send({ 'type': 'advance' });
    await interpreter.send({ 'type': 'advance' });
    await interpreter.send({ 'type': 'advance' });

    console.log('State after 3 advances:', interpreter.getState().variant);
    console.log('Sound history:', TrafficLightDemo.soundsPlayed);
    console.log('State history:', TrafficLightDemo.history);

    unsubscribe();
    interpreter.stop();

    return { 'finalVariant': interpreter.getState().variant, 'history': TrafficLightDemo.history, 'soundsPlayed': TrafficLightDemo.soundsPlayed };
  }
}

const results = await TrafficLightDemo.run();
// #endregion usage

assert.equal(results.finalVariant, 'red');
assert.deepEqual(results.soundsPlayed, ['chime']);
assert.deepEqual(results.history, ['red', 'green', 'amber', 'red']);

console.log('traffic-light: all assertions passed');
