import { FsmError } from './FsmError.js';

/**
 * Thrown when an FSM component is configured with invalid options.
 */
export class FsmConfigError extends FsmError {
  constructor(message: string) {
    super({ 'code': 'fsm.invalidConfig', 'message': message, 'retryable': false });
  }
}
