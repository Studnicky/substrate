import { FsmError } from './errors/FsmError.js';

/**
 * Thrown when `transition()` is called against a state the machine
 * considers terminated (per `isTerminated()`). `reduce()` is never invoked
 * in this case — the machine short-circuits before the reducer runs.
 */
export class MachineTerminatedError extends FsmError {
  readonly eventType: string;
  readonly stateVariant: string;

  constructor(options: { readonly 'eventType': string; readonly 'stateVariant': string }) {
    super({
      'code': 'fsm.machineTerminated',
      'message': `Machine is terminated in state '${options.stateVariant}' — event '${options.eventType}' rejected`
    });
    this.eventType = options.eventType;
    this.stateVariant = options.stateVariant;
  }
}
