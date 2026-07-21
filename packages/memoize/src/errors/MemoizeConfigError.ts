import { MemoizeError } from './MemoizeError.js';

/** Thrown when memoization configuration is invalid. */
export class MemoizeConfigError extends MemoizeError {
  public constructor(message: string) {
    super({ 'code': 'memoize.invalidConfig', 'message': message });
  }
}
