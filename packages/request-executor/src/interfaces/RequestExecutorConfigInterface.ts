import type { FetchClientInterface } from '@studnicky/fetch';
import type { Retry } from '@studnicky/retry';
import type { RetryConfigInterface } from '@studnicky/retry/interfaces';
import type { Signal } from '@studnicky/signal';

import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';
import type { RequestScopeFactoryInterface } from './RequestScopeFactoryInterface.js';

/**
 * Configuration accepted by `RequestExecutor.create()`.
 */
export interface RequestExecutorConfigInterface {
  /** Default deadline in milliseconds for calls without a per-call deadline. */
  readonly 'deadlineMs'?: RequestDeadlineEntity.Type['deadlineMs'];

  /** HTTP client implementation for this runtime. */
  readonly 'fetchClient': FetchClientInterface;

  /** A pre-built retry primitive or configuration passed to `Retry.create()`. */
  readonly 'retry'?: RetryConfigInterface | Retry;

  /**
   * A scope factory. Request execution only creates a scope when supplied.
   */
  readonly 'scope'?: RequestScopeFactoryInterface;

  /** A pre-built signal primitive. Defaults to `Signal.create()`. */
  readonly 'signal'?: Signal;
}
