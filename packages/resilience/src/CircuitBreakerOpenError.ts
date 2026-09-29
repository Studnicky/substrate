import { ResilienceError } from './errors/ResilienceError.js';

export class CircuitBreakerOpenError extends ResilienceError {
  public override readonly name: string = 'CircuitBreakerOpenError';

  constructor(name: string) {
    super({ 'code': 'resilience.circuitOpen', 'message': `Circuit breaker '${name}' is open`, 'retryable': true });
  }
}
