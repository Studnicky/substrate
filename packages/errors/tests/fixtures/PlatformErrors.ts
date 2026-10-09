import { RuntimeError } from '../../src/errors/RuntimeError.js';

/** Produces a genuine platform `Error`, the kind ThrownValueEntity must classify without help. */
export class PlatformErrors {
  static create(message: string, cause?: unknown): Error {
    let platformError: unknown;
    try {
      decodeURIComponent('%');
    } catch (error) {
      platformError = error;
    }
    if (platformError instanceof Error) {
      platformError.message = message;
      if (cause !== undefined) {
        platformError.cause = cause;
      }
      return platformError;
    }
    throw RuntimeError.create('the platform accepted a malformed URI component');
  }
}
