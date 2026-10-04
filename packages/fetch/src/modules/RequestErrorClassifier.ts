import { BaseError } from '@studnicky/types/browser';

import type { RequestFailureSignalsInterface } from '../interfaces/RequestFailureSignalsInterface.js';

import { AbortError, RequestFailedError, TimeoutError } from '../errors/index.js';

/**
 * Turns the value a platform `fetch` call rejected with into a named fetch error.
 * Shared by the Node and browser clients so both classify a failed request identically.
 */
export class RequestErrorClassifier {
  /**
   * Reclassifies an abort/timeout rejection into `AbortError`/`TimeoutError`; every other value
   * is returned unchanged.
   */
  public static classifyAbortOrTimeout(error: unknown, url: string, signals: RequestFailureSignalsInterface): unknown {
    if (error instanceof TimeoutError || error instanceof AbortError) {
      return error;
    }
    if (RequestErrorClassifier.#isDeadlineReason(error, signals) && signals.timeoutMs !== undefined) {
      const result = new TimeoutError(url, signals.timeoutMs);
      return result;
    }
    if (error instanceof Error) {
      const result = RequestErrorClassifier.#classifyPlatformError(error, url, signals);
      return result;
    }
    return error;
  }

  /** Unwraps the platform rejection a transport carried as the `cause` of its `RequestFailedError`. */
  public static platformCause(error: unknown): unknown {
    const result = error instanceof RequestFailedError ? error.platformCause() : error;
    return result;
  }

  /** True when `error` is the non-`BaseError` reason the caller aborted the request's own signal with. */
  public static isCallerAbortReason(error: unknown, externalSignal: AbortSignal | null | undefined): boolean {
    const result = error instanceof BaseError ? false : externalSignal?.aborted === true && Object.is(error, externalSignal.reason);
    return result;
  }

  /** A `BaseError` is already named; any other value is a platform failure wrapped with the original as `cause`. */
  public static toNamed(error: unknown, url: string): BaseError {
    const result = error instanceof BaseError ? error : new RequestFailedError(url, error);
    return result;
  }

  static #classifyPlatformError(error: Error, url: string, signals: RequestFailureSignalsInterface): AbortError | Error | TimeoutError {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      const result = RequestErrorClassifier.#abortOrTimeout(error, url, signals);
      return result;
    }
    return error;
  }

  static #abortOrTimeout(error: Error, url: string, signals: RequestFailureSignalsInterface): AbortError | TimeoutError {
    const result = RequestErrorClassifier.#isDeadlineExpired(signals) && signals.timeoutMs !== undefined
      ? new TimeoutError(url, signals.timeoutMs)
      : new AbortError(url, error.message);
    return result;
  }

  /** The request's own deadline aborted its composed signal, and the caller's signal did not. */
  static #isDeadlineExpired(signals: RequestFailureSignalsInterface): boolean {
    const result = signals.requestSignal?.aborted === true && signals.timeoutMs !== undefined && signals.externalSignal?.aborted !== true;
    return result;
  }

  /** True when `error` is the reason the composed signal aborted with at its deadline. */
  static #isDeadlineReason(error: unknown, signals: RequestFailureSignalsInterface): boolean {
    const result = RequestErrorClassifier.#isDeadlineExpired(signals) && Object.is(error, signals.requestSignal?.reason);
    return result;
  }
}
