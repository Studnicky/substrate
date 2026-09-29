import { Pipeline } from '@studnicky/pipeline/node';
import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { MailboxCapacityExceededError } from '../../src/errors/MailboxCapacityExceededError.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { StateMachine } from '../../src/StateMachine.js';
import { MachineTerminatedError } from '../../src/MachineTerminatedError.js';
import { PipelineEffectHandler } from '../../src/PipelineEffectHandler.js';
import type { EffectInterpreterConstructorOptionsInterface } from '../../src/interfaces/EffectInterpreterConstructorOptionsInterface.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { PipelineEffectInterface } from '../../src/interfaces/PipelineEffectInterface.js';
import { EffectInterpreterScenarioCaseEntity } from './entities/EffectInterpreterScenarioCaseEntity.js';
import scenarioGroups from './EffectInterpreter.scenarios.json' with { type: 'json' };

type DemoState = { readonly variant: 'idle' } | { readonly variant: 'active' };
type DemoEvent = { readonly type: 'activate' | 'deactivate' };
type DemoEffect = { readonly message: string; readonly variant: 'log' };

type ScenarioCase = EffectInterpreterScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(EffectInterpreterScenarioCaseEntity.Schema, EffectInterpreterScenarioCaseEntity.Node);

class DemoMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  public constructor() { super(); }

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

function createDemoMachine(): StateMachine<DemoState, DemoEvent, DemoEffect> {
  return new DemoMachine();
}

class RejectingMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  public constructor() { super(); }

  override getInitialState(): DemoState { return { variant: 'idle' }; }
  override reduce(state: DemoState, event: DemoEvent): FsmStepInterface<DemoState, DemoEffect> {
    if (event.type === 'deactivate') {
      throw RuntimeError.create('deliberately rejected');
    }
    if (state.variant === 'idle' && event.type === 'activate') {
      return { state: { variant: 'active' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

function createRejectingMachine(): StateMachine<DemoState, DemoEvent, DemoEffect> {
  return new RejectingMachine();
}

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

function requireEvent(event: DemoEvent | undefined): DemoEvent {
  if (event === undefined) {
    throw RuntimeError.create('Expected a scenario event');
  }
  return event;
}

async function captureRejectedError<T>(promise: Promise<T>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }

  assert.fail('Expected promise to reject');
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  const runnerMap: Record<ScenarioCase['shape'], (caseData: ScenarioCase) => Promise<void> | void> = {
    'create-empty-machine-id': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId }),
        { message: String(caseData.expected.message) }
      );
    },
    'create-default-identity': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine());
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'create-non-integer-mailbox-capacity': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId, mailboxCapacity: Number(caseData.input.mailboxCapacity) }),
        { message: String(caseData.expected.message) }
      );
    },
    'create-non-positive-mailbox-capacity': (caseData) => {
      assert.throws(
        () => EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId, mailboxCapacity: Number(caseData.input.mailboxCapacity) }),
        { message: String(caseData.expected.message) }
      );
    },
    'effect-handler-called-after-transition': (caseData) => {
      const logged: string[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), {
        handler: (effect) => { logged.push(effect.message); },
        machineId: caseData.input.machineId,
      });
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(logged, caseData.expected.logged);
      });
    },
    'effect-handler-omitted': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
        assert.equal(states.length, caseData.expected.notificationCount);
        assert.deepEqual(states[1], caseData.expected.state);
      });
    },
    'get-state-before-start': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      assert.throws(() => interp.getState(), /not started/);
    },
    'handler-dispatches-within-send': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), {
        handler: (_effect, dispatch) => { dispatch({ type: 'deactivate' }); },
        machineId: caseData.input.machineId,
      });
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'mailbox-capacity-bounds-mailbox': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), {
        machineId: caseData.input.machineId,
        mailboxCapacity: Number(caseData.input.mailboxCapacity),
      });
      interp.start();
      const sends = (caseData.input.events ?? []).map((event) => interp.send(requireEvent(event)));
      const overflowingSend = sends[1];
      if (overflowingSend === undefined) {
        throw RuntimeError.create('Expected a second queued send');
      }
      return captureRejectedError(overflowingSend).then((error) => {
        assert.ok(error instanceof MailboxCapacityExceededError);
        assert.equal(error.name, caseData.expected.rejectionType);
      })
        .then(() => sends[0])
        .then(() => sends[2])
        .then(() => sends[3])
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'processes-events-fifo': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.start();
      const [firstEvent, secondEvent] = caseData.input.events ?? [];
      if (firstEvent === undefined || secondEvent === undefined) {
        throw RuntimeError.create('Expected two queued events');
      }
      const p1 = interp.send(firstEvent);
      const p2 = interp.send(secondEvent);
      return Promise.all([p1, p2]).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    },
    'unsubscribe-stops-notifications': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      const unsub = interp.subscribe((state) => { states.push(state); });
      interp.start();
      unsub();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.equal(states.length, caseData.expected.notificationCount);
      });
    },
    'queued-send-resolves-after-own-transition': (caseData) => {
      const interp = EffectInterpreter.create(createRejectingMachine(), { machineId: caseData.input.machineId });
      interp.start();
      const rejectingSend = interp.send(requireEvent(caseData.input.rejectedEvent));
      const queuedSend = interp.send(requireEvent(caseData.input.recoveryEvent));
      return assert.rejects(() => rejectingSend)
        .then(() => queuedSend)
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'rejected-transition-does-not-wedge': (caseData) => {
      const interp = EffectInterpreter.create(createRejectingMachine(), { machineId: caseData.input.machineId });
      interp.start();
      return assert.rejects(() => interp.send(requireEvent(caseData.input.rejectedEvent)))
        .then(() => interp.send(requireEvent(caseData.input.recoveryEvent)))
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'send-before-start': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      return assert.rejects(() => interp.send(requireEvent(caseData.input.event)), /not running/);
    },
    'send-transitions-state': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
        assert.equal(states.length, caseData.expected.notificationCount);
        assert.deepEqual(states[1], caseData.expected.state);
      });
    },
    'snapshot-isolation': (caseData) => {
      type NestedState = { readonly variant: 'idle' | 'active'; details: { count: number } };
      type NestedEvent = { readonly type: 'activate' };

      class NestedMachine extends StateMachine<NestedState, NestedEvent> {
        public constructor() { super(); }

        override getInitialState(): NestedState { return { details: { count: Number(caseData.input.initialCount) }, variant: 'idle' }; }
        override reduce(_state: NestedState): FsmStepInterface<NestedState> {
          return { effects: [], state: { details: { count: Number(caseData.input.activeCount) }, variant: 'active' } };
        }
      }

      function createNestedMachine(): StateMachine<NestedState, NestedEvent> {
        return new NestedMachine();
      }

      const observed: NestedState[] = [];
      const interp = EffectInterpreter.create(createNestedMachine(), { machineId: caseData.input.machineId });
      interp.subscribe((state) => {
        observed.push(state);
        state.details.count = Number(caseData.input.mutatedCount);
      });
      interp.start();

      const initial = interp.getState();
      initial.details.count = Number(caseData.input.postMutationCount);
      assert.equal(interp.getState().details.count, Number(caseData.input.initialCount));

      const nestedEvent = requireEvent(caseData.input.event);
      if (nestedEvent.type !== 'activate') {
        throw RuntimeError.create('Expected an activate event for snapshot-isolation');
      }

      return interp.send({ type: 'activate' }).then(() => {
        const active = interp.getState();
        active.details.count = Number(caseData.input.postTransitionMutationCount);

        assert.equal(interp.getState().details.count, Number(caseData.input.activeCount));
        assert.deepEqual(observed.map((state) => state.details.count), caseData.expected.observedCounts);
      });
    },
    'start-sets-initial-state': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.equal(states.length, caseData.expected.notificationCount);
      assert.deepEqual(states[0], caseData.expected.state);
    },
    'start-is-idempotent': (caseData) => {
      const states: DemoState[] = [];
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.subscribe((state) => { states.push(state); });
      interp.start();
      interp.start();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.equal(states.length, caseData.expected.notificationCount);
    },
    'stop-after-start': (caseData) => {
      class RecordingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        readonly stoppedStates: Array<DemoState | undefined> = [];

        public constructor(options: EffectInterpreterConstructorOptionsInterface<DemoState, DemoEvent, DemoEffect>) { super(options); }

        protected override onStop(state: DemoState | undefined): void {
          this.stoppedStates.push(state);
        }
      }

      const interp = new RecordingStopInterpreter({ machine: createDemoMachine(), machineId: caseData.input.machineId });
      interp.start();
      interp.stop();
      assert.deepEqual(interp.stoppedStates, [caseData.expected.state]);
      return;
    },
    'stop-while-handler-in-flight': (caseData) => {
      let releaseHandler: (() => void) | undefined;
      const handlerGate = new Promise<void>((resolve) => { releaseHandler = resolve; });

      const interp = EffectInterpreter.create(createDemoMachine(), {
        handler: async () => { await handlerGate; },
        machineId: caseData.input.machineId,
      });
      interp.start();

      const activatePromise = interp.send(requireEvent(caseData.input.activateEvent));
      const deactivatePromise = interp.send(requireEvent(caseData.input.deactivateEvent));

      return Promise.resolve()
        .then(() => Promise.resolve())
        .then(() => {
          interp.stop();
          const release = releaseHandler;
          if (release === undefined) {
            throw RuntimeError.create('Handler gate was not initialized');
          }
          release();
          return activatePromise;
        })
        .then(() => captureRejectedError(deactivatePromise))
        .then((error) => {
          assertErrorMessageIncludes(error, String(caseData.expected.rejectionMessage));
        })
        .then(() => {
          assert.deepEqual(interp.getState(), caseData.expected.state);
        });
    },
    'stop-before-start': (caseData) => {
      class RecordingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        readonly stoppedStates: Array<DemoState | undefined> = [];

        public constructor(options: EffectInterpreterConstructorOptionsInterface<DemoState, DemoEvent, DemoEffect>) { super(options); }

        protected override onStop(state: DemoState | undefined): void {
          this.stoppedStates.push(state);
        }
      }

      const interp = new RecordingStopInterpreter({ machine: createDemoMachine(), machineId: caseData.input.machineId });
      interp.stop();
      assert.deepEqual(interp.stoppedStates, [undefined]);
      return;
    },
    'stop-hook-throws': (caseData) => {
      const original = RuntimeError.create('stop boom');

      class ThrowingStopInterpreter extends EffectInterpreter<DemoState, DemoEvent, DemoEffect> {
        protected override onStop(): void {
          throw original;
        }
      }

      const interp = ThrowingStopInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.start();
      interp.stop();
      assert.deepEqual(interp.getState(), caseData.expected.state);
      assert.strictEqual(original.message, 'stop boom');
    },
    'throwing-observer-does-not-block-send': (caseData) => {
      const interp = EffectInterpreter.create(createDemoMachine(), { machineId: caseData.input.machineId });
      interp.subscribe(() => {
        throw RuntimeError.create('observer boom');
      });
      interp.start();
      return interp.send(requireEvent(caseData.input.event)).then(() => {
        assert.deepEqual(interp.getState(), caseData.expected.state);
      });
    }
  };

  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('EffectInterpreter', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});


type PipelineState =
  | { readonly 'variant': 'idle' }
  | { readonly 'variant': 'processing' }
  | { readonly 'variant': 'completed' };
type PipelineEvent =
  | { readonly 'type': 'begin' }
  | { readonly 'sequence': readonly string[]; readonly 'type': 'complete' }
  | { readonly 'sequence': readonly string[]; readonly 'type': 'invalid' };
type PipelineEffect = PipelineEffectInterface<PipelineEvent>;

class PipelineWorkflowMachine extends StateMachine<PipelineState, PipelineEvent, PipelineEffect> {
  readonly rejectedEvents: PipelineEvent[] = [];

  public constructor() { super(); }

  override getInitialState(): PipelineState { return { variant: 'idle' }; }

  override reduce(state: PipelineState, event: PipelineEvent): FsmStepInterface<PipelineState, PipelineEffect> {
    if (state.variant === 'idle' && event.type === 'begin') {
      return {
        effects: [{ event: { sequence: [], type: 'complete' }, variant: 'pipeline' }],
        state: { variant: 'processing' }
      };
    }
    if (state.variant === 'processing' && event.type === 'complete') {
      if (event.sequence.join(',') !== 'normalise,authorise') {
        throw RuntimeError.create('pipeline stages did not preserve the declared order');
      }
      return { effects: [], state: { variant: 'completed' } };
    }
    if (state.variant === 'processing' && event.type === 'invalid') {
      this.rejectedEvents.push(event);
      throw RuntimeError.create('pipeline mapped an event that is invalid while processing');
    }
    return { effects: [], state };
  }

  protected override isTerminated(state: PipelineState): boolean {
    return state.variant === 'completed';
  }
}

function createPipelineWorkflowMachine(): PipelineWorkflowMachine {
  return new PipelineWorkflowMachine();
}

void describe('EffectInterpreter pipeline effects', () => {
  void it('runs ordered pipeline stages before its mapped event reaches the reducer', async () => {
    const stages: string[] = [];
    const pipeline = Pipeline.create<PipelineEvent>([
      (event) => {
        stages.push('normalise');
        if (event.type !== 'complete') { return event; }
        return { sequence: [...event.sequence, 'normalise'], type: 'complete' };
      },
      (event) => {
        stages.push('authorise');
        if (event.type !== 'complete') { return event; }
        return { sequence: [...event.sequence, 'authorise'], type: 'complete' };
      }
    ]);
    const interpreter = EffectInterpreter.create(createPipelineWorkflowMachine(), {
      handler: PipelineEffectHandler.create(pipeline),
      machineId: 'pipeline-ordered'
    });

    interpreter.start();
    await interpreter.send({ type: 'begin' });

    assert.deepEqual(stages, ['normalise', 'authorise']);
    assert.deepEqual(interpreter.getState(), { variant: 'completed' });
  });

  void it('keeps the intermediate state when the reducer rejects the pipeline-mapped event', async () => {
    const pipeline = Pipeline.create<PipelineEvent>([
      () => ({ sequence: [], type: 'invalid' })
    ]);
    const machine = createPipelineWorkflowMachine();
    const interpreter = EffectInterpreter.create(machine, {
      handler: PipelineEffectHandler.create(pipeline),
      machineId: 'pipeline-invalid-event'
    });

    interpreter.start();
    await interpreter.send({ type: 'begin' });

    assert.deepEqual(machine.rejectedEvents, [{ sequence: [], type: 'invalid' }]);
    assert.deepEqual(interpreter.getState(), { variant: 'processing' });
  });

  void it('rejects new events after a pipeline-mapped event reaches a terminal state', async () => {
    const pipeline = Pipeline.create<PipelineEvent>([
      (event) => event,
      (event) => event.type === 'complete'
        ? { sequence: ['normalise', 'authorise'], type: 'complete' }
        : event
    ]);
    const interpreter = EffectInterpreter.create(createPipelineWorkflowMachine(), {
      handler: PipelineEffectHandler.create(pipeline),
      machineId: 'pipeline-terminal'
    });

    interpreter.start();
    await interpreter.send({ type: 'begin' });

    assert.deepEqual(interpreter.getState(), { variant: 'completed' });
    await assert.rejects(() => interpreter.send({ type: 'begin' }), MachineTerminatedError);
  });

  void it('propagates pipeline rejection after committing the intermediate state', async () => {
    const pipeline = Pipeline.create<PipelineEvent>([
      () => { throw RuntimeError.create('pipeline failed'); }
    ]);
    const interpreter = EffectInterpreter.create(createPipelineWorkflowMachine(), {
      handler: PipelineEffectHandler.create(pipeline),
      machineId: 'pipeline-rejection'
    });

    interpreter.start();

    await assert.rejects(() => interpreter.send({ type: 'begin' }), /pipeline failed/);
    assert.deepEqual(interpreter.getState(), { variant: 'processing' });
  });
});
