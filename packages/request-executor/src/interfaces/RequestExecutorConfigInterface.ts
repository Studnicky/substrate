import type { Context } from '@studnicky/context';
import type { ClientConfigInterface, FetchClient } from '@studnicky/fetch';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Signal } from '@studnicky/signal';
import type { Timing } from '@studnicky/timing';

import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';

/**
 * Configuration accepted by `RequestExecutor.create()`.
 */
export interface RequestExecutorConfigInterface {
  /**
   * A pre-built `Context` instance. Request execution only runs inside a
   * scope when supplied because `Context.create()` requires a caller-owned name.
   */
  readonly 'context'?: Context;

  /** Default deadline in milliseconds for calls without a per-call deadline. */
  readonly 'deadlineMs'?: RequestDeadlineEntity.Type['deadlineMs'];

  /** A pre-built client or configuration passed to `FetchClient.create()`. */
  readonly 'fetchClient'?: ClientConfigInterface | FetchClient;

  /** A pre-built retry primitive or configuration passed to `Retry.create()`. */
  readonly 'retry'?: RetryConfigInterface | Retry;

  /** A pre-built signal primitive. Defaults to `Signal.create()`. */
  readonly 'signal'?: Signal;

  /** A pre-built timing primitive. Timing events are omitted when absent. */
  readonly 'timing'?: Timing;
}
