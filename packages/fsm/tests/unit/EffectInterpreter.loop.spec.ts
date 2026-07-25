import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { MailboxCapacityExceededError } from '../../src/errors/MailboxCapacityExceededError.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';
import scenarioGroups from './EffectInterpreter.scenarios.json';

type DemoState = { readonly variant: 'idle' } | { readonly variant: 'active' };
type DemoEvent = { readonly type: 'activate' } | { readonly type: 'deactivate' };
type DemoEffect = { readonly message: string; readonly variant: 'log' };

type ScenarioExpected = {
  readonly logged: string[];
  readonly message: string;
  readonly notificationCount: number;
  readonly observedCounts: number[];
  readonly rejectionMessage: string;
  readonly rejectionType: string;
  readonly state: unknown;
};

type ScenarioInput = {
  readonly activeCount: number;
  readonly activateEvent: DemoEvent;
  readonly deactivateEvent: DemoEvent;
  readonly event: DemoEvent;
  readonly events: DemoEvent[];
  readonly initialCount: number;
  readonly machineId: string;
  readonly mailboxCapacity: number;
  readonly mutatedCount: number;
  readonly postMutationCount: number;
  readonly postTransitionMutationCount: number;
  readonly recoveryEvent: DemoEvent;
  readonly rejectedEvent: DemoEvent;
};

type ScenarioShape =
  | 'create-empty-machine-id'
  | 'create-default-identity'
  | 'create-non-integer-mailbox-capacity'
  | 'create-non-positive-mailbox-capacity'
  | 'effect-handler-called-after-transition'
  | 'effect-handler-omitted'
  | 'get-state-before-start'
  | 'handler-dispatches-within-send'
  | 'mailbox-capacity-bounds-mailbox'
  | 'processes-events-fifo'
  | 'queued-send-resolves-after-own-transition'
  | 'rejected-transition-does-not-wedge'
  | 'send-before-start'
  | 'send-transitions-state'
  | 'snapshot-isolation'
  | 'start-sets-initial-state'
  | 'start-is-idempotent'
  | 'stop-after-start'
  | 'stop-while-handler-in-flight'
  | 'stop-before-start'
  | 'stop-hook-throws'
  | 'throwing-observer-does-not-block-send'
  | 'unsubscribe-stops-notifications';

type ScenarioCase = {
  description: string;
  expected: ScenarioExpected;
  input: ScenarioInput;
  shape: ScenarioShape;
  name: string;
};

class DemoMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  override getInitialState(): DemoState { return { variant: 'idle' }; }

  override reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { state: { variant: 'active' }, effects: [{ variant: 'log', message: 'activated' }] };
    }
    if (state.variant === 'active' && event.type === 'deactivate') {
      return { state: { variant: 'idle' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

function assertErrorMessageIncludes(error: unknown, expectedMessage: string): void {
  assert.ok(error instanceof Error);
  assert.equal(error.message.includes(expectedMessage), true);
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  const runnerMap: Record<ScenarioCase['shape'], (caseData: ScenarioCase) => Promise<void> | void> = {
    'create-empty-machine-id': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId }),
        { message: caseData.expected.message }
      );
    },
    'create-default-identity': (caseData) => {
      const interp = EffectInterpreter.create({ machine: new DemoMachine() });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'create-non-integer-mailbox-capacity': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId, mailboxCapacity: caseData.input.mailboxCapacity }),
        { message: caseData.expected.message }
      );
    },
    'create-non-positive-mailbox-capacity': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId, mailboxCapacity: caseData.input.mailboxCapacity }),
        { message: caseData.expected.message }
      );
    },
    'effect-handler-called-after-transition': (caseData) => {
      const logged: string[] = [];
      const interp = EffectInterpreter.create({
        machine: new DemoMachine(),
        handler: (effect) => { logged.push(effect.message); },
        machineId: caseData.input.machineId,
      });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(logged, caseData.expected.logged);
      });
    },
    'effect-handler-omitted': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
        assert.equal(states.length, caseData.expected.notificationCount);
        assert.deepEqual(states[1], caseData.expected.state);
      });
    },
    'get-state-before-start': (caseData) => {
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      assert.throws(() => interp.getState(), /not started/);
    },
    'handler-dispatches-within-send': (caseData) => {
      const interp = EffectInterpreter.create({
        machine: new DemoMachine(),
        handler: (_effect, dispatch) => { dispatch({ type: 'deactivate' }); },
        machineId: caseData.input.machineId,
      });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'mailbox-capacity-bounds-mailbox': (caseData) => {
      const interp = EffectInterpreter.create({
        machine: new DemoMachine(),
        machineId: caseData.input.machineId,
        mailboxCapacity: caseData.input.mailboxCapacity,
      });
      interp.start();
      const sends = caseData.input.events.map((event: DemoEvent) => interp.send(event));
      return assert.rejects(() => sends[1], (error: unknown) => {
        assert.ok(error instanceof MailboxCapacityExceededError);
        assert.equal(error.name, caseData.expected.rejectionType);
        return true;
      })
        .then(() => sends[0])
        .then(() => sends[2])
        .then(() => sends[3])
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'processes-events-fifo': (caseData) => {
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.start();
      const [firstEvent, secondEvent] = caseData.input.events;
      const p1 = interp.send(firstEvent);
      const p2 = interp.send(secondEvent);
      return Promise.all([p1, p2]).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'unsubscribe-stops-notifications': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      const unsub = interp.subscribe((state) => { states.push(state); });
      interp.start();
      unsub();
      return interp.send(caseData.input.event).then(() => {
        assert.equal(states.length, caseData.expected.notificationCount);
      });
    },
    'queued-send-resolves-after-own-transition': (caseData) => {
      class RejectingMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
        override getInitialState(): DemoState { return { variant: 'idle' }; }
        override reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
          if (event.type === 'deactivate') {
            throw new Error('deliberately rejected');
          }
          if (state.variant === 'idle' && event.type === 'activate') {
            return { state: { variant: 'active' }, effects: [] };
          }
          return { state, effects: [] };
        }
      }

      const interp = EffectInterpreter.create({ machine: new RejectingMachine(), machineId: caseData.input.machineId });
      interp.start();
      const rejectingSend = interp.send(caseData.input.rejectedEvent);
      const queuedSend = interp.send(caseData.input.recoveryEvent);
      return assert.rejects(() => rejectingSend)
        .then(() => queuedSend)
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'rejected-transition-does-not-wedge': (caseData) => {
      class RejectingMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
        override getInitialState(): DemoState { return { variant: 'idle' }; }
        override reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
          if (event.type === 'deactivate') {
            throw new Error('deliberately rejected');
          }
          if (state.variant === 'idle' && event.type === 'activate') {
            return { state: { variant: 'active' }, effects: [] };
          }
          return { state, effects: [] };
        }
      }

      const interp = EffectInterpreter.create({ machine: new RejectingMachine(), machineId: caseData.input.machineId });
      interp.start();
      return assert.rejects(() => interp.send(caseData.input.rejectedEvent))
        .then(() => interp.send(caseData.input.recoveryEvent))
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'send-before-start': (caseData) => {
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      return assert.rejects(() => interp.send(caseData.input.event), /not running/);
    },
    'send-transitions-state': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
        assert.equal(states.length, caseData.expected.notificationCount);
        assert.deepEqual(states[1], caseData.expected.state);
      });
    },
    'snapshot-isolation': (caseData) => {
      type NestedState = { readonly variant: 'idle' | 'active'; details: { count: number } };
      type NestedEvent = { readonly type: 'activate' };

      class NestedMachine extends StateMachine<NestedState, NestedEvent> {
        override getInitialState(): NestedState { return { details: { count: caseData.input.initialCount }, variant: 'idle' }; }
        override reduce(_state: NestedState): FsmStepInterface<NestedState> {
          return { effects: [], state: { details: { count: caseData.input.activeCount }, variant: 'active' } };
        }
      }

      const observed: NestedState[] = [];
      const interp = EffectInterpreter.create({ machine: new NestedMachine(), machineId: caseData.input.machineId });
      interp.subscribe((state) => {
        observed.push(state);
        state.details.count = caseData.input.mutatedCount;
      });
      interp.start();

      const initial = interp.getState();
      initial.details.count = caseData.input.postMutationCount;
      assert.equal(interp.getState().details.count, caseData.input.initialCount);

      return interp.send(caseData.input.event).then(() => {
        const active = interp.getState();
        active.details.count = caseData.input.postTransitionMutationCount;

        assert.equal(interp.getState().details.count, caseData.input.activeCount);
        assert.deepEqual(observed.map((state) => state.details.count), caseData.expected.observedCounts);
      });
    },
    'start-sets-initial-state': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.equal(states.length, caseData.expected.notificationCount);
      assert.deepEqual(states[0], caseData.expected.state);
    },
    'start-is-idempotent': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      interp.start();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.equal(states.length, caseData.expected.notificationCount);
    },
    'stop-after-start': (caseData) => {
      class RecordingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        readonly stoppedStates: Array<DemoState | undefined> = [];

        protected override onStop(state: DemoState | undefined): void {
          this.stoppedStates.push(state);
        }
      }

      const interp = new RecordingStopInterpreter({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.start();
      interp.stop();
      assert.deepEqual(interp.stoppedStates, [caseData.expected.state]);
      return;
    },
    'stop-while-handler-in-flight': (caseData) => {
      let releaseHandler: (() => void) | undefined;
      const handlerGate = new Promise<void>((resolve) => { releaseHandler = resolve; });

      const interp = EffectInterpreter.create({
        machine: new DemoMachine(),
        handler: async () => { await handlerGate; },
        machineId: caseData.input.machineId,
      });
      interp.start();

      const activatePromise = interp.send(caseData.input.activateEvent);
      const deactivatePromise = interp.send(caseData.input.deactivateEvent);

      return Promise.resolve()
        .then(() => Promise.resolve())
        .then(() => {
          interp.stop();
          const release = releaseHandler;
          if (release === undefined) {
            throw new Error('Handler gate was not initialized');
          }
          release();
          return activatePromise;
        })
        .then(() => assert.rejects(() => deactivatePromise, (error: unknown) => {
          assertErrorMessageIncludes(error, caseData.expected.rejectionMessage);
          return true;
        }))
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'stop-before-start': (caseData) => {
      class RecordingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        readonly stoppedStates: Array<DemoState | undefined> = [];

        protected override onStop(state: DemoState | undefined): void {
          this.stoppedStates.push(state);
        }
      }

      const interp = new RecordingStopInterpreter({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.stop();
      assert.deepEqual(interp.stoppedStates, [undefined]);
      return;
    },
    'stop-hook-throws': (caseData) => {
      const original = new Error('stop boom');

      class ThrowingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        protected override onStop(): void {
          throw original;
        }
      }

      const interp = ThrowingStopInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.start();
      interp.stop();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.strictEqual(original.message, 'stop boom');
    },
    'throwing-observer-does-not-block-send': (caseData) => {
      const interp = EffectInterpreter.create({ machine: new DemoMachine(), machineId: caseData.input.machineId });
      interp.subscribe(() => {
        throw new Error('observer boom');
      });
      interp.start();
      return interp.send(caseData.input.event).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    }
  };

  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('EffectInterpreter', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
