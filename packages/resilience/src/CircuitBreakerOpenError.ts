export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is open`);
    this.name = 'CircuitBreakerOpenError';
  }
}
