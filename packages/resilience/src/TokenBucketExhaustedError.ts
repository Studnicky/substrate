import { ResilienceError } from './errors/ResilienceError.js';

export class TokenBucketExhaustedError extends ResilienceError {
  public override readonly name: string = 'TokenBucketExhaustedError';

  constructor() {
    super({ 'code': 'resilience.tokenBucketExhausted', 'message': 'Token bucket exhausted', 'retryable': true });
  }
}
