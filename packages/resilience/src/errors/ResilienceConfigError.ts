import { ResilienceError } from './ResilienceError.js';

/** Thrown when a resilience primitive is constructed with invalid configuration. */
export class ResilienceConfigError extends ResilienceError {
  constructor(message: string) {
    super({ 'code': 'resilience.invalidConfig', 'message': message, 'retryable': false });
  }
}
