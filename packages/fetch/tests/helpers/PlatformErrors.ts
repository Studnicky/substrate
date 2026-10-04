import { FetchTestError } from './FetchTestError.js';

/** Produces genuine platform errors, optionally tagged with a string `code` the way Node and undici errors are. */
export class PlatformErrors {
  static create(code?: string): Error {
    let platformError: unknown;
    try {
      decodeURIComponent('%');
    } catch (error) {
      platformError = error;
    }
    if (platformError instanceof Error) {
      if (code !== undefined) {
        Reflect.set(platformError, 'code', code);
      }
      return platformError;
    }
    throw new FetchTestError('the platform accepted a malformed URI component');
  }
}
