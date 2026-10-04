import { FsmError } from './FsmError.js';

/**
 * Thrown when an operation requires the interpreter to be started but it has not been.
 */
export class InterpreterNotStartedError extends FsmError {
  public override readonly name: string = 'InterpreterNotStartedError';

  constructor(message: string) {
    super({ 'code': 'fsm.interpreterNotStarted', 'message': message, 'retryable': false });
  }
}
