/**
 * Error thrown when context operations fail
 *
 * Thrown by Context when attempting invalid operations such as
 * accessing destroyed contexts or exceeding scope limits.
 */
export class ContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextError';
  }
}
