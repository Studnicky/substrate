import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';

type DemoState = { readonly 'variant': 'idle' } | { readonly 'variant': 'active' };
type DemoEvent = { readonly 'type': 'activate' } | { readonly 'type': 'deactivate' };
type DemoEffect = { readonly 'message': string; readonly 'variant': 'log' };

class DemoMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  getInitialState(): DemoState { return { 'variant': 'idle' }; }
  reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { 'effects': [{ 'message': 'activated', 'variant': 'log' }], 'state': { 'variant': 'active' } };
    }
    if (state.variant === 'active' && event.type === 'deactivate') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }
    return { 'effects': [], 'state': state };
  }
}

class FailingEffectMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  getInitialState(): DemoState { return { 'variant': 'idle' }; }
  reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { 'effects': [{ 'message': 'fail-me', 'variant': 'log' }], 'state': { 'variant': 'active' } };
    }
    return { 'effects': [], 'state': state };
  }
}

interface HookRecord<T> {
  readonly 'payload': T;
}

class ObservedInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
  constructor() {
    const machine = new DemoMachine();
    super({ 'handler': () => { /* no-op handler */ }, 'machine': machine, 'machineId': 'observed-test' });
  }

  readonly starts: HookRecord<{ 'variant': string }>[] = [];
  readonly stops: HookRecord<{ 'variant': string | undefined }>[] = [];
  readonly enqueues: HookRecord<{ 'type': string }>[] = [];
  readonly transitions: HookRecord<{ 'event': string; 'from': string; 'to': string }>[] = [];
  readonly enters: HookRecord<{ 'variant': string }>[] = [];
  readonly exits: HookRecord<{ 'variant': string }>[] = [];
  readonly effectStarts: HookRecord<{ 'variant': string }>[] = [];
  readonly effectSuccesses: HookRecord<{ 'variant': string }>[] = [];
  readonly effectErrors: HookRecord<{ 'error': string; 'variant': string }>[] = [];

  protected override onStart(state: DemoState): void {
    this.starts.push({ 'payload': { 'variant': state.variant } });
  }

  protected override onStop(state: DemoState | undefined): void {
    this.stops.push({ 'payload': { 'variant': state?.variant } });
  }

  protected override onEnqueue(event: DemoEvent): void {
    this.enqueues.push({ 'payload': { 'type': event.type } });
  }

  protected override onTransition(from: DemoState, to: DemoState, event: DemoEvent): void {
    this.transitions.push({ 'payload': { 'event': event.type, 'from': from.variant, 'to': to.variant } });
  }

  protected override onEnterState(state: DemoState): void {
    this.enters.push({ 'payload': { 'variant': state.variant } });
  }

  protected override onExitState(state: DemoState): void {
    this.exits.push({ 'payload': { 'variant': state.variant } });
  }

  protected override onEffectStart(effect: DemoEffect): void {
    this.effectStarts.push({ 'payload': { 'variant': effect.variant } });
  }

  protected override onEffectSuccess(effect: DemoEffect): void {
    this.effectSuccesses.push({ 'payload': { 'variant': effect.variant } });
  }

  protected override onEffectError(effect: DemoEffect, error: Error): void {
    this.effectErrors.push({ 'payload': { 'error': error.message, 'variant': effect.variant } });
  }
}

describe('EffectInterpreter lifecycle hooks', () => {
  it('onStart fires once with initial state after start()', () => {
    const interp = new ObservedInterpreter();
    interp.start();

    assert.equal(interp.starts.length, 1);
    assert.equal(interp.starts[0]!.payload.variant, 'idle');
  });

  it('onStart does not fire when already running', () => {
    const interp = new ObservedInterpreter();
    interp.start();
    interp.start(); // second start is a no-op

    assert.equal(interp.starts.length, 1);
  });

  it('onStop fires once with last state after stop()', () => {
    const interp = new ObservedInterpreter();
    interp.start();
    interp.stop();

    assert.equal(interp.stops.length, 1);
    assert.equal(interp.stops[0]!.payload.variant, 'idle');
  });

  it('onEnqueue fires for each event sent', async () => {
    const interp = new ObservedInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });
    await interp.send({ 'type': 'deactivate' });

    assert.equal(interp.enqueues.length, 2);
    assert.equal(interp.enqueues[0]!.payload.type, 'activate');
    assert.equal(interp.enqueues[1]!.payload.type, 'deactivate');
  });

  it('onTransition fires with correct from/to/event on variant change', async () => {
    const interp = new ObservedInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });

    assert.equal(interp.transitions.length, 1);
    assert.equal(interp.transitions[0]!.payload.from, 'idle');
    assert.equal(interp.transitions[0]!.payload.to, 'active');
    assert.equal(interp.transitions[0]!.payload.event, 'activate');
  });

  it('onExitState fires before onEnterState on transition', async () => {
    const order: string[] = [];

    class OrderedInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      constructor() {
        super({ 'machine': new DemoMachine(), 'machineId': 'ordered-test' });
      }
      protected override onExitState(_s: DemoState): void { order.push('exit'); }
      protected override onTransition(_f: DemoState, _t: DemoState, _e: DemoEvent): void { order.push('transition'); }
      protected override onEnterState(_s: DemoState): void { order.push('enter'); }
    }

    const interp = new OrderedInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });
    assert.deepEqual(order, ['exit', 'transition', 'enter']);
  });

  it('onEnterState and onExitState do not fire when variant is unchanged', async () => {
    const interp = new ObservedInterpreter();
    interp.start();
    // send deactivate while idle — no-op transition (state object unchanged)
    await interp.send({ 'type': 'deactivate' });

    assert.equal(interp.transitions.length, 0);
    assert.equal(interp.enters.length, 0);
    assert.equal(interp.exits.length, 0);
  });

  it('onEffectStart and onEffectSuccess fire around handler invocation', async () => {
    const interp = new ObservedInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });

    assert.equal(interp.effectStarts.length, 1);
    assert.equal(interp.effectStarts[0]!.payload.variant, 'log');
    assert.equal(interp.effectSuccesses.length, 1);
    assert.equal(interp.effectSuccesses[0]!.payload.variant, 'log');
    assert.equal(interp.effectErrors.length, 0);
  });

  it('onEffectStart fires before onEffectSuccess', async () => {
    const order: string[] = [];

    class OrderedEffectInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      constructor() {
        super({ 'handler': () => { /* no-op */ }, 'machine': new DemoMachine(), 'machineId': 'effect-order-test' });
      }
      protected override onEffectStart(_e: DemoEffect): void { order.push('start'); }
      protected override onEffectSuccess(_e: DemoEffect): void { order.push('success'); }
    }

    const interp = new OrderedEffectInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });
    assert.deepEqual(order, ['start', 'success']);
  });

  it('onEffectError fires and error propagates when handler throws', async () => {
    const machine = new FailingEffectMachine();
    const errors: string[] = [];

    class ErrorInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      constructor() {
        super({
          'handler': () => { throw new Error('handler blew up'); },
          'machine': machine,
          'machineId': 'error-test'
        });
      }
      protected override onEffectError(_effect: DemoEffect, error: Error): void {
        errors.push(error.message);
      }
    }

    const interp = new ErrorInterpreter();
    interp.start();
    await assert.rejects(() => interp.send({ 'type': 'activate' }), /handler blew up/);
    assert.equal(errors.length, 1);
    assert.equal(errors[0], 'handler blew up');
  });

  it('onEffectSuccess does not fire when handler throws', async () => {
    const machine = new FailingEffectMachine();

    class SuccessTracker extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      successes = 0;
      constructor() {
        super({
          'handler': () => { throw new Error('boom'); },
          'machine': machine,
          'machineId': 'no-success-test'
        });
      }
      protected override onEffectSuccess(_e: DemoEffect): void { this.successes++; }
    }

    const interp = new SuccessTracker();
    interp.start();
    await assert.rejects(() => interp.send({ 'type': 'activate' }));
    assert.equal(interp.successes, 0);
  });

  it('a throwing transition hook does not replace a successful send() result', async () => {
    class ThrowingHookInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      constructor() {
        super({ 'machine': new DemoMachine(), 'machineId': 'throwing-hook-test' });
      }

      protected override onTransition(): void {
        throw new Error('hook boom');
      }
    }

    const interp = new ThrowingHookInterpreter();
    interp.start();
    await interp.send({ 'type': 'activate' });

    assert.deepEqual(interp.getState(), { 'variant': 'active' });
  });

  it('captures a rejected async onStart hook without an unhandled rejection', async () => {
    class AsyncRejectingStartInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
      constructor() {
        super({ 'machine': new DemoMachine(), 'machineId': 'async-start-test' });
      }

      protected override async onStart(_state: DemoState): Promise<void> {
        await Promise.resolve();
        throw new Error('async onStart boom');
      }
    }

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const interp = new AsyncRejectingStartInterpreter();

      // start() never awaits invoke()'s return — this call is synchronous.
      interp.start();
      assert.deepEqual(interp.getState(), { 'variant': 'idle' });

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.equal(rejectionEvents.length, 0);
      assert.equal(interp.hookErrorCount, 1);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
