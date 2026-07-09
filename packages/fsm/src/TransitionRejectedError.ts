import { FsmError } from './errors/FsmError.js';

/**
 * Thrown by a reducer to deliberately reject an event as invalid business
 * logic — the machine is fine, the event is simply not valid in the given
 * state. Distinct from a reducer that throws unexpectedly (surfaced as
 * `ReducerThrewError`, which signals a reducer defect rather than a
 * deliberate rejection).
 *
 * `StateMachine#transition()` recognizes this type specifically: when a
 * reducer throws a `TransitionRejectedError`, it is re-thrown as-is (not
 * wrapped), so callers can `instanceof`-check it to distinguish a deliberate
 * rejection from an actual reducer bug.
 */
export class TransitionRejectedError extends FsmError {
  readonly eventType: string;
  readonly stateVariant: string;

  constructor(options: { readonly 'eventType': string; readonly 'reason': string; readonly 'stateVariant': string }) {
    super({
      'code': 'fsm.transitionRejected',
      'message': `Transition rejected for event '${options.eventType}' in state '${options.stateVariant}': ${options.reason}`
    });
    this.eventType = options.eventType;
    this.stateVariant = options.stateVariant;
  }
}
