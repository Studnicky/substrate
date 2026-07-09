/**
 * RequestExecutor configuration type
 */

import type { Context } from '@studnicky/context';
import type { FetchClient } from '@studnicky/fetch';
import type { ClientConfigType } from '@studnicky/fetch/interfaces';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Signal } from '@studnicky/signal';
import type { Timing } from '@studnicky/timing';

/**
 * Configuration accepted by `RequestExecutor.create()` / `RequestExecutorBuilder`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * a config shape that is passed to the primitive's own `create()`. `signal`, `timing`,
 * and `context` accept instances only — they have no config-object shorthand.
 */
export type RequestExecutorConfigType = {
  /**
   * A pre-built `Context` instance. No default — request execution only runs inside a
   * scope when supplied, since `Context.create()` requires a `name` this kit can't invent.
   */
  'context'?: Context;

  /**
   * Default deadline (ms) applied to `execute()` calls that don't pass their own `deadlineMs`.
   */
  'deadlineMs'?: number;

  /**
   * A pre-built `FetchClient` instance, or config passed to `FetchClient.create()`.
   */
  'fetchClient'?: ClientConfigType | FetchClient;

  /**
   * A pre-built `Retry` instance, or config passed to `Retry.create()`.
   */
  'retry'?: Partial<RetryConfigInterface> | Retry;

  /**
   * A pre-built `Signal` instance. Defaults to `Signal.create()`.
   */
  'signal'?: Signal;

  /**
   * A pre-built `Timing` instance. No default — timing spans are only recorded when supplied.
   */
  'timing'?: Timing;
};
