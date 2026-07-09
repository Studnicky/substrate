import { MemoizeError } from './MemoizeError.js';

/** Thrown when `MemoizeBuilder#build()` is called with missing required configuration. */
export class MemoizeConfigError extends MemoizeError {
  public constructor(message: string) {
    super({ 'code': 'memoize.invalidConfig', 'message': message });
  }
}
