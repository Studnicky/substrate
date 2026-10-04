import type { FsmStepInterface } from '@studnicky/fsm/interfaces';

import { EffectInterpreter, StateMachine } from '@studnicky/fsm/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { PipelineEffectInterface } from '../../../src/fsm/interfaces/PipelineEffectInterface.js';
import type { PipelineMachineEventTypeEntity } from './entities/PipelineMachineEventTypeEntity.js';
import type { PipelineMachineStateVariantEntity } from './entities/PipelineMachineStateVariantEntity.js';

import { PipelineEffectHandler } from '../../../src/fsm/PipelineEffectHandler.js';
import { Pipeline } from '../../../src/pipeline/Pipeline.js';

interface EventInterface {
  readonly 'steps': readonly string[];
  readonly 'type': PipelineMachineEventTypeEntity.Type;
}

interface StateInterface {
  readonly 'variant': PipelineMachineStateVariantEntity.Type;
}

class PipelineMachine extends StateMachine<
  StateInterface,
  EventInterface,
  PipelineEffectInterface<EventInterface>
> {
  public constructor() {
    super();
  }

  override getInitialState(): StateInterface {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: StateInterface,
    event: EventInterface
  ): FsmStepInterface<StateInterface, PipelineEffectInterface<EventInterface>> {
    if (state.variant === 'idle' && event.type === 'begin') {
      return {
        'effects': [{ 'event': { 'steps': [], 'type': 'complete' }, 'variant': 'pipeline' }],
        'state': state
      };
    }
    if (event.type === 'complete') {
      return { 'effects': [], 'state': { 'variant': 'complete' } };
    }
    return { 'effects': [], 'state': state };
  }
}

void it('runs a pipeline effect through the FSM effect contract', async () => {
  const pipeline = Pipeline.create<EventInterface>([
    (event) => {
      return { ...event, 'steps': [...event.steps, 'mapped'] };
    }
  ]);
  const interpreter = EffectInterpreter.create(new PipelineMachine(), {
    'handler': PipelineEffectHandler.create(pipeline),
    'machineId': 'pipeline-effect-handler'
  });

  interpreter.start();
  await interpreter.send({ 'steps': [], 'type': 'begin' });

  assert.deepEqual(interpreter.getState(), { 'variant': 'complete' });
});
