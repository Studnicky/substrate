import { JsonError } from './JsonError.js';

/** Thrown when a value cannot be detached into an immutable snapshot. */
export class ImmutableSnapshotError extends JsonError {
  public constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'json.immutableSnapshot',
      'message': 'The value cannot be cloned into an immutable snapshot.',
      'retryable': false
    });
  }
}
