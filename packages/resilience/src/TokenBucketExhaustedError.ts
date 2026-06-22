export class TokenBucketExhaustedError extends Error {
  constructor() {
    super('Token bucket exhausted');
    this.name = 'TokenBucketExhaustedError';
  }
}
