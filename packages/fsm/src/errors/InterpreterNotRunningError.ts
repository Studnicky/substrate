import { FsmError } from './FsmError.js';

/**
 * Thrown when an operation requires the interpreter to be running but it is not.
 */
export class InterpreterNotRunningError extends FsmError {
  constructor(message: string) {
    super({ 'code': 'fsm.interpreterNotRunning', 'message': message, 'retryable': false });
  }
}
