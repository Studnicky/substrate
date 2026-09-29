import { FsmError } from './FsmError.js';

/**
 * Thrown when an FSM component is configured with invalid options.
 */
export class FsmConfigError extends FsmError {
  public override readonly name: string = 'FsmConfigError';

  constructor(message: string) {
    super({ 'code': 'fsm.invalidConfig', 'message': message, 'retryable': false });
  }
}
