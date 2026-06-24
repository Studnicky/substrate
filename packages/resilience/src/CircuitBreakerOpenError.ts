import { ResilienceError } from './errors/ResilienceError.js';

export class CircuitBreakerOpenError extends ResilienceError {
  constructor(name: string) {
    super({ 'code': 'resilience.circuitOpen', 'message': `Circuit breaker '${name}' is open`, 'retryable': true });
  }
}
