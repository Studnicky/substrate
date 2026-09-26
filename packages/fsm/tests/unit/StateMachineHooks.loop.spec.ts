import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import { StateMachineHooksScenarioCaseEntity } from './entities/StateMachineHooksScenarioCaseEntity.js';
import scenarioGroups from './StateMachineHooks.scenarios.json' with { type: 'json' };

type TrafficState = { readonly variant: 'red' | 'green' | 'amber' };
type TrafficEvent = { readonly type: 'advance' };

type ScenarioCase = StateMachineHooksScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(StateMachineHooksScenarioCaseEntity.Schema, StateMachineHooksScenarioCaseEntity.Node);

function requireState(scenarioCase: ScenarioCase): TrafficState {
  const { state } = scenarioCase.input;
  if (state === undefined) {
    throw RuntimeError.create('Expected a scenario state');
  }
  return state;
}

class TrafficMachine extends StateMachine<TrafficState, TrafficEvent> {
  public constructor() { super(); }

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
  public constructor() { super(); }

  override getInitialState(): TrafficState { return { variant: 'red' }; }

  override reduce(_state: TrafficState, _event: TrafficEvent): FsmStepInterface<TrafficState> {
    throw RuntimeError.create('reducer error');
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
      readonly failure = RuntimeError.create('async onEnterState boom', { cause: this.failureDetails });

      diagnostics() {
        return this.hooks.getHookErrors();
      }

      protected override async onEnterState(_state: TrafficState): Promise<void> {
        await Promise.resolve();
        throw this.failure;
      }
    }

    let rejectionEventCount = 0;
    const onUnhandledRejection = (): void => { rejectionEventCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const machine = new AsyncRejectingEnterStateMachine();
      const step = machine.transition(requireState(scenarioCase), scenarioCase.input.event);
      assert.deepEqual(step.state, { variant: scenarioCase.expected.state });
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEventCount, scenarioCase.expected.rejectionEvents);
      assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'enter-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
    assert.equal(machine.enters.length, 1);
    assert.equal(machine.enters[0]!.args.variant, scenarioCase.expected.variant);
  },
  'exit-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
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
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
    assert.deepEqual(order, scenarioCase.expected.order);
  },
  'multiple-transitions': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    for (const state of scenarioCase.input.states ?? []) {
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
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
    assert.equal(machine.rejections.length, scenarioCase.expected.rejectionCount);
  },
  'throwing-rejection-hook': (scenarioCase) => {
    class ThrowingRejectedHookMachine extends ThrowingMachine {
      protected override onTransitionRejected(): void {
        throw RuntimeError.create('hook boom');
      }
    }

    const machine = new ThrowingRejectedHookMachine();
    assert.throws(() => machine.transition(requireState(scenarioCase), scenarioCase.input.event), ReducerThrewError);
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'throwing-transition-hook': (scenarioCase) => {
    class ThrowingTransitionHookMachine extends TrafficMachine {
      protected override onTransition(): void {
        throw RuntimeError.create('hook boom');
      }
    }

    const machine = new ThrowingTransitionHookMachine();
    const step = machine.transition(requireState(scenarioCase), scenarioCase.input.event);
    assert.deepEqual(step.state, { variant: scenarioCase.expected.state });
    assert.deepEqual(step.effects, scenarioCase.expected.toEffects);
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'transition-hook': (scenarioCase) => {
    const machine = new ObservedTrafficMachine();
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
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
    assert.throws(() => machine.transition(requireState(scenarioCase), scenarioCase.input.event), ReducerThrewError);
    assert.equal(machine.rejections.length, 1);
    assert.equal(machine.rejections[0]!.args.state, scenarioCase.expected.state);
    assert.equal(machine.rejections[0]!.args.event, scenarioCase.expected.event);
    assert.ok(machine.rejections[0]!.args.reason.includes(String(scenarioCase.expected.reasonIncludes)));
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  },
  'unchanged-no-hooks': (scenarioCase) => {
    class SelfLoopMachine extends StateMachine<TrafficState, TrafficEvent> {
      public constructor() { super(); }

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
    machine.transition(requireState(scenarioCase), scenarioCase.input.event);
    assert.equal(machine.count, scenarioCase.expected.hookCount);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('StateMachine hooks', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
