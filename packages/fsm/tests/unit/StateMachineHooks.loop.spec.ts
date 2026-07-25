import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';
import scenarioGroups from './StateMachineHooks.scenarios.json';

type TrafficState =
  | { readonly variant: 'red' }
  | { readonly variant: 'green' }
  | { readonly variant: 'amber' };

type TrafficEvent = { readonly type: 'advance' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        transition: { event: 'advance'; from: TrafficState['variant']; to: TrafficState['variant'] };
      };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'transition-hook';
      name: string;
    }
  | {
      description: string;
      expected: { variant: 'green' };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'enter-hook';
      name: string;
    }
  | {
      description: string;
      expected: { variant: 'red' };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'exit-hook';
      name: string;
    }
  | {
      description: string;
      expected: { order: Array<'exit' | 'transition' | 'enter'> };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'hook-order';
      name: string;
    }
  | {
      description: string;
      expected: { hookCount: 0 };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'unchanged-no-hooks';
      name: string;
    }
  | {
      description: string;
      expected: {
        enters: Array<{ variant: TrafficState['variant'] }>;
        exits: Array<{ variant: TrafficState['variant'] }>;
        transitions: Array<{ event: 'advance'; from: TrafficState['variant']; to: TrafficState['variant'] }>;
      };
      input: { event: TrafficEvent; states: TrafficState[] };
      shape: 'multiple-transitions';
      name: string;
    }
  | {
      description: string;
      expected: {
        event: 'advance';
        hookCount: 0;
        reasonIncludes: string;
        state: 'red';
      };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'transition-rejected-hook';
      name: string;
    }
  | {
      description: string;
      expected: { rejectionCount: 0 };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'successful-transition-no-rejection';
      name: string;
    }
  | {
      description: string;
      expected: { hookCount: 1; state: 'green'; toEffects: [] };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'throwing-transition-hook';
      name: string;
    }
  | {
      description: string;
      expected: { hookCount: 1 };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'throwing-rejection-hook';
      name: string;
    }
  | {
      description: string;
      expected: { hookCount: 1; rejectionEvents: 0; state: 'green' };
      input: { event: TrafficEvent; state: TrafficState };
      shape: 'async-rejection';
      name: string;
    };

class TrafficMachine extends StateMachine<TrafficState, TrafficEvent> {
  override getInitialState(): TrafficState { return { variant: 'red' }; }

  override reduce(state: TrafficState, _event: TrafficEvent): FsmStepInterface<TrafficState> {
    if (state.variant === 'red') {
      return { effects: [], state: { variant: 'green' } };
    }
    if (state.variant === 'green') {
      return { effects: [], state: { variant: 'amber' } };
    }
    return { effects: [], state: { variant: 'red' } };
  }
}

class ThrowingMachine extends StateMachine<TrafficState, TrafficEvent> {
  override getInitialState(): TrafficState { return { variant: 'red' }; }

  override reduce(_state: TrafficState, _event: TrafficEvent): FsmStepInterface<TrafficState> {
    throw new Error('reducer error');
  }
}

class ObservedTrafficMachine extends TrafficMachine {
  readonly transitions: Array<{ args: { event: string; from: string; to: string } }> = [];
  readonly enters: Array<{ args: { variant: string } }> = [];
  readonly exits: Array<{ args: { variant: string } }> = [];
  readonly rejections: Array<{ args: { event: string; reason: string; state: string } }> = [];

  protected override onTransition(from: TrafficState, to: TrafficState, event: TrafficEvent): void {
    this.transitions.push({ args: { event: event.type, from: from.variant, to: to.variant } });
  }

  protected override onEnterState(state: TrafficState): void {
    this.enters.push({ args: { variant: state.variant } });
  }

  protected override onExitState(state: TrafficState): void {
    this.exits.push({ args: { variant: state.variant } });
  }

  protected override onTransitionRejected(state: TrafficState, event: TrafficEvent, reason: string): void {
    this.rejections.push({ args: { event: event.type, reason, state: state.variant } });
  }
}

class ObservedThrowingMachine extends ThrowingMachine {
  readonly rejections: Array<{ args: { event: string; reason: string; state: string } }> = [];

  protected override onTransitionRejected(state: TrafficState, event: TrafficEvent, reason: string): void {
    this.rejections.push({ args: { event: event.type, reason, state: state.variant } });
  }
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'async-rejection': async (scenarioCase) => {
    class AsyncRejectingEnterStateMachine extends TrafficMachine {
      readonly failureDetails = { labels: ['initial'] };
      readonly failure = new Error('async onEnterState boom', { cause: this.failureDetails });

      diagnostics() {
        return this.hooks.getHookErrors();
      }

      protected override async onEnterState(_state: TrafficState): Promise<void> {
        await Promise.resolve();
        throw this.failure;
      }
    }

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const machine = new AsyncRejectingEnterStateMachine();
      const step = machine.transition(scenarioCase.input.state, scenarioCase.input.event);
      assert.deepEqual(step.state, { variant: scenarioCase.expected.state });
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, scenarioCase.expected.rejectionEvents);
      assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'enter-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.enters.length, 1);
    assert.equal(machine.enters[0]!.args.variant, scenarioCase.expected.variant);
  },
  'exit-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.exits.length, 1);
    assert.equal(machine.exits[0]!.args.variant, scenarioCase.expected.variant);
  },
  'hook-order': (scenarioCase) => {
    const order: Array<'exit' | 'transition' | 'enter'> = [];

    class OrderedMachine extends TrafficMachine {
      protected override onExitState(_s: TrafficState): void { order.push('exit'); }
      protected override onTransition(_f: TrafficState, _t: TrafficState, _e: TrafficEvent): void { order.push('transition'); }
      protected override onEnterState(_s: TrafficState): void { order.push('enter'); }
    }

    const machine = new OrderedMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.deepEqual(order, scenarioCase.expected.order);
  },
  'multiple-transitions': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    for (const state of scenarioCase.input.states) {
      machine.transition(state, scenarioCase.input.event);
    }

    assert.deepEqual(
      machine.transitions.map((entry) => ({ event: entry.args.event, from: entry.args.from, to: entry.args.to })),
      scenarioCase.expected.transitions
    );
    assert.deepEqual(machine.exits.map((entry) => ({ variant: entry.args.variant })), scenarioCase.expected.exits);
    assert.deepEqual(machine.enters.map((entry) => ({ variant: entry.args.variant })), scenarioCase.expected.enters);
  },
  'successful-transition-no-rejection': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.rejections.length, scenarioCase.expected.rejectionCount);
  },
  'throwing-rejection-hook': (scenarioCase) => {
    class ThrowingRejectedHookMachine extends ThrowingMachine {
      protected override onTransitionRejected(): void {
        throw new Error('hook boom');
      }
    }

    const machine = new ThrowingRejectedHookMachine();
    assert.throws(
      () => machine.transition(scenarioCase.input.state, scenarioCase.input.event),
      (err: unknown) => err instanceof ReducerThrewError
    );
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'throwing-transition-hook': (scenarioCase) => {
    class ThrowingTransitionHookMachine extends TrafficMachine {
      protected override onTransition(): void {
        throw new Error('hook boom');
      }
    }

    const machine = new ThrowingTransitionHookMachine();
    const step = machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.deepEqual(step.state, { variant: scenarioCase.expected.state });
    assert.deepEqual(step.effects, scenarioCase.expected.toEffects);
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'transition-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.transitions.length, 1);
    assert.deepEqual(
      {
        event: machine.transitions[0]!.args.event,
        from: machine.transitions[0]!.args.from,
        to: machine.transitions[0]!.args.to
      },
      scenarioCase.expected.transition
    );
  },
  'transition-rejected-hook': (scenarioCase) => {
    const machine = new ObservedThrowingMachine();
    assert.throws(
      () => machine.transition(scenarioCase.input.state, scenarioCase.input.event),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        return true;
      }
    );
    assert.equal(machine.rejections.length, 1);
    assert.equal(machine.rejections[0]!.args.state, scenarioCase.expected.state);
    assert.equal(machine.rejections[0]!.args.event, scenarioCase.expected.event);
    assert.ok(machine.rejections[0]!.args.reason.includes(scenarioCase.expected.reasonIncludes));
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'unchanged-no-hooks': (scenarioCase) => {
    class SelfLoopMachine extends StateMachine<TrafficState, TrafficEvent> {
      override getInitialState(): TrafficState { return { variant: 'red' }; }
      override reduce(state: TrafficState, _event: TrafficEvent): FsmStepInterface<TrafficState> {
        return { effects: [], state };
      }
    }

    class ObservedSelfLoop extends SelfLoopMachine {
      count = 0;
      protected override onTransition(): void { this.count += 1; }
      protected override onEnterState(): void { this.count += 1; }
      protected override onExitState(): void { this.count += 1; }
    }

    const machine = new ObservedSelfLoop();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.count, scenarioCase.expected.hookCount);
  }
};

void describe('StateMachine hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runnerMap[scenario.shape](scenario);
    });
  }
});
