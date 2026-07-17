import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type TrafficState =
  | { readonly 'variant': 'red' }
  | { readonly 'variant': 'green' }
  | { readonly 'variant': 'amber' };

type TrafficEvent = { readonly 'type': 'advance' };

class TrafficMachine extends StateMachine<TrafficState, TrafficEvent> {
  getInitialState(): TrafficState { return { 'variant': 'red' }; }
  reduce(state: TrafficState, _event: TrafficEvent): FsmStepType<TrafficState> {
    if (state.variant === 'red')   { return { 'effects': [], 'state': { 'variant': 'green' } }; }
    if (state.variant === 'green') { return { 'effects': [], 'state': { 'variant': 'amber' } }; }
    return { 'effects': [], 'state': { 'variant': 'red' } };
  }
}

class ThrowingMachine extends StateMachine<TrafficState, TrafficEvent> {
  getInitialState(): TrafficState { return { 'variant': 'red' }; }
  reduce(_state: TrafficState, _event: TrafficEvent): FsmStepType<TrafficState> {
    throw new Error('reducer error');
  }
}

interface HookCall<TArgs> {
  readonly 'args': TArgs;
}

class ObservedTrafficMachine extends TrafficMachine {
  readonly transitions: HookCall<{ 'from': string; 'to': string; 'event': string }>[] = [];
  readonly enters: HookCall<{ 'variant': string }>[] = [];
  readonly exits: HookCall<{ 'variant': string }>[] = [];
  readonly rejections: HookCall<{ 'state': string; 'event': string; 'reason': string }>[] = [];

  protected override onTransition(from: TrafficState, to: TrafficState, event: TrafficEvent): void {
    this.transitions.push({ 'args': { 'event': event.type, 'from': from.variant, 'to': to.variant } });
  }

  protected override onEnterState(state: TrafficState): void {
    this.enters.push({ 'args': { 'variant': state.variant } });
  }

  protected override onExitState(state: TrafficState): void {
    this.exits.push({ 'args': { 'variant': state.variant } });
  }

  protected override onTransitionRejected(state: TrafficState, event: TrafficEvent, reason: string): void {
    this.rejections.push({ 'args': { 'event': event.type, 'reason': reason, 'state': state.variant } });
  }
}

class ObservedThrowingMachine extends ThrowingMachine {
  readonly rejections: HookCall<{ 'state': string; 'event': string; 'reason': string }>[] = [];

  protected override onTransitionRejected(state: TrafficState, event: TrafficEvent, reason: string): void {
    this.rejections.push({ 'args': { 'event': event.type, 'reason': reason, 'state': state.variant } });
  }
}

describe('StateMachine lifecycle hooks', () => {
  it('onTransition fires with correct from/to/event on variant change', () => {
    const machine = new ObservedTrafficMachine();
    machine.transition({ 'variant': 'red' }, { 'type': 'advance' });

    assert.equal(machine.transitions.length, 1);
    assert.equal(machine.transitions[0]!.args.from, 'red');
    assert.equal(machine.transitions[0]!.args.to, 'green');
    assert.equal(machine.transitions[0]!.args.event, 'advance');
  });

  it('onEnterState fires with the new state on variant change', () => {
    const machine = new ObservedTrafficMachine();
    machine.transition({ 'variant': 'red' }, { 'type': 'advance' });

    assert.equal(machine.enters.length, 1);
    assert.equal(machine.enters[0]!.args.variant, 'green');
  });

  it('onExitState fires with the old state on variant change', () => {
    const machine = new ObservedTrafficMachine();
    machine.transition({ 'variant': 'red' }, { 'type': 'advance' });

    assert.equal(machine.exits.length, 1);
    assert.equal(machine.exits[0]!.args.variant, 'red');
  });

  it('hooks fire in exit → transition → enter order', () => {
    const order: string[] = [];

    class OrderedMachine extends TrafficMachine {
      protected override onExitState(_s: TrafficState): void { order.push('exit'); }
      protected override onTransition(_f: TrafficState, _t: TrafficState, _e: TrafficEvent): void { order.push('transition'); }
      protected override onEnterState(_s: TrafficState): void { order.push('enter'); }
    }

    const m = new OrderedMachine();
    m.transition({ 'variant': 'red' }, { 'type': 'advance' });
    assert.deepEqual(order, ['exit', 'transition', 'enter']);
  });

  it('no hooks fire when variant is unchanged', () => {
    class SelfLoopMachine extends StateMachine<TrafficState, TrafficEvent> {
      getInitialState(): TrafficState { return { 'variant': 'red' }; }
      reduce(state: TrafficState, _event: TrafficEvent): FsmStepType<TrafficState> {
        return { 'effects': [], 'state': state }; // same object, same variant
      }
    }

    class ObservedSelfLoop extends SelfLoopMachine {
      count = 0;
      protected override onTransition(): void { this.count++; }
      protected override onEnterState(): void { this.count++; }
      protected override onExitState(): void { this.count++; }
    }

    const m = new ObservedSelfLoop();
    m.transition({ 'variant': 'red' }, { 'type': 'advance' });
    assert.equal(m.count, 0);
  });

  it('multiple transitions fire hooks each time', () => {
    const machine = new ObservedTrafficMachine();
    machine.transition({ 'variant': 'red' }, { 'type': 'advance' });
    machine.transition({ 'variant': 'green' }, { 'type': 'advance' });
    machine.transition({ 'variant': 'amber' }, { 'type': 'advance' });

    assert.equal(machine.transitions.length, 3);
    assert.equal(machine.transitions[0]!.args.from, 'red');
    assert.equal(machine.transitions[1]!.args.from, 'green');
    assert.equal(machine.transitions[2]!.args.from, 'amber');

    assert.equal(machine.exits.length, 3);
    assert.equal(machine.enters.length, 3);
  });

  it('onTransitionRejected fires with state/event/reason when reducer throws', () => {
    const machine = new ObservedThrowingMachine();
    assert.throws(
      () => machine.transition({ 'variant': 'red' }, { 'type': 'advance' }),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        return true;
      }
    );

    assert.equal(machine.rejections.length, 1);
    assert.equal(machine.rejections[0]!.args.state, 'red');
    assert.equal(machine.rejections[0]!.args.event, 'advance');
    assert.ok(machine.rejections[0]!.args.reason.length > 0);
  });

  it('onTransitionRejected does not fire on successful transition', () => {
    const machine = new ObservedTrafficMachine();
    machine.transition({ 'variant': 'red' }, { 'type': 'advance' });
    assert.equal(machine.rejections.length, 0);
  });

  it('a throwing transition hook does not replace the returned transition step', () => {
    class ThrowingTransitionHookMachine extends TrafficMachine {
      protected override onTransition(): void {
        throw new Error('hook boom');
      }
    }

    const machine = new ThrowingTransitionHookMachine();
    const step = machine.transition({ 'variant': 'red' }, { 'type': 'advance' });

    assert.deepEqual(step.state, { 'variant': 'green' });
    assert.deepEqual(step.effects, []);
  });

  it('a throwing onTransitionRejected hook does not replace the reducer error', () => {
    class ThrowingRejectedHookMachine extends ThrowingMachine {
      protected override onTransitionRejected(): void {
        throw new Error('hook boom');
      }
    }

    const machine = new ThrowingRejectedHookMachine();
    assert.throws(
      () => machine.transition({ 'variant': 'red' }, { 'type': 'advance' }),
      (err: unknown) => err instanceof ReducerThrewError
    );
  });

  it('an async-overridden hook that rejects is routed through onHookError without an unhandled rejection, because invoke() actually receives its return value', async () => {
    class AsyncRejectingEnterStateMachine extends TrafficMachine {
      protected override async onEnterState(_state: TrafficState): Promise<void> {
        await Promise.resolve();
        throw new Error('async onEnterState boom');
      }
    }

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const machine = new AsyncRejectingEnterStateMachine();
      const step = machine.transition({ 'variant': 'red' }, { 'type': 'advance' });

      // The caller never awaits anything hook-related — transition() is synchronous.
      assert.deepEqual(step.state, { 'variant': 'green' });

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.equal(rejectionEvents.length, 0);
      assert.equal(machine.hookErrorCount, 1);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
