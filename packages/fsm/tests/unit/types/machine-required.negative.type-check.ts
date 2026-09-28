/**
 * Compile-only negative fixture: `machine` is a required, non-nullable
 * positional parameter on `EffectInterpreter.create`/`InterpreterHistory.create`,
 * enforced by the type system rather than a runtime check. `tsc -b` fails
 * this file if either `@ts-expect-error` stops occurring.
 *
 * @module
 */
import { EffectInterpreter } from '../../../src/EffectInterpreter.js';
import { InterpreterHistory } from '../../../src/InterpreterHistory.js';
import { StateMachine } from '../../../src/StateMachine.js';
import type { FsmStepInterface } from '../../../src/interfaces/FsmStepInterface.js';

type DemoState = { readonly variant: 'a' } | { readonly variant: 'b' };
type DemoEvent = { readonly type: 'noop' };

class DemoMachine extends StateMachine<DemoState, DemoEvent> {
  public constructor() { super(); }
  override getInitialState(): DemoState { return { variant: 'a' }; }
  override reduce(state: DemoState): FsmStepInterface<DemoState> { return { state, effects: [] }; }
}

// @ts-expect-error machine is required
EffectInterpreter.create();

// @ts-expect-error machine is required
InterpreterHistory.create();

const machine = new DemoMachine();
void EffectInterpreter.create(machine);
void InterpreterHistory.create(machine, {});
