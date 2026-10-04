import type { FsmStepInterface } from '../../../src/interfaces/FsmStepInterface.js';
import type { MachineABStateEntity } from '../entities/MachineABStateEntity.js';
import type { MachineNoopEventEntity } from '../entities/MachineNoopEventEntity.js';

/**
 * Compile-only negative fixture: `machine` is a required, non-nullable
 * positional parameter on `EffectInterpreter.create`/`InterpreterHistory.create`,
 * enforced by the type system rather than a runtime check. `RequiresArguments`
 * resolves to `never` once a callable accepts zero arguments, so `tsc -b` fails
 * this file if either `create` stops requiring `machine`.
 *
 * @module
 */
import { EffectInterpreter } from '../../../src/EffectInterpreter.js';
import { InterpreterHistory } from '../../../src/InterpreterHistory.js';
import { StateMachine } from '../../../src/StateMachine.js';

type RequiresArguments<TCallable extends (...argumentList: never[]) => unknown> = [] extends Parameters<TCallable> ? never : true;

class DemoMachine extends StateMachine<MachineABStateEntity.Type, MachineNoopEventEntity.Type> {
  public constructor() { super(); }
  override getInitialState(): MachineABStateEntity.Type { return { 'variant': 'a' }; }
  override reduce(state: MachineABStateEntity.Type): FsmStepInterface<MachineABStateEntity.Type> { return { 'effects': [], 'state': state }; }
}

export const machineRequiredNegativeTypeCheck: {
  readonly 'effectInterpreter': RequiresArguments<typeof EffectInterpreter.create>;
  readonly 'interpreterHistory': RequiresArguments<typeof InterpreterHistory.create>;
} = { 'effectInterpreter': true, 'interpreterHistory': true };

const machine = new DemoMachine();
void EffectInterpreter.create(machine);
void InterpreterHistory.create(machine, {});
