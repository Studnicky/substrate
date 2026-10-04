import { ResilienceError } from './ResilienceError.js';

/** Thrown when a resilience primitive is constructed with invalid configuration. */
export class ResilienceConfigError extends ResilienceError {
  public override readonly name: string = 'ResilienceConfigError';

  constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'resilience.invalidConfig', 'message': message, 'retryable': false });
  }
}
