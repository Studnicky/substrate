import type { FetchClientInterface } from '@studnicky/fetch';
import type { Retry } from '@studnicky/retry';
import type { Signal } from '@studnicky/signal';

import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';
import type { RequestScopeFactoryInterface } from './RequestScopeFactoryInterface.js';

/** Fully resolved runtime dependencies retained by a `RequestExecutor`. */
export interface RequestExecutorDepsInterface {
  readonly 'deadlineMs': RequestDeadlineEntity.Type['deadlineMs'] | undefined;
  readonly 'fetchClient': FetchClientInterface;
  readonly 'retry': Retry;
  readonly 'scope': RequestScopeFactoryInterface | undefined;
  readonly 'signal': Signal;
}
