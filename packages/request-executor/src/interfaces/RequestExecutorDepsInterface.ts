import type { Context } from '@studnicky/context';
import type { FetchClient } from '@studnicky/fetch';
import type { Retry } from '@studnicky/retry';
import type { Signal } from '@studnicky/signal';
import type { Timing } from '@studnicky/timing';

import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';

/** Fully resolved runtime dependencies retained by a `RequestExecutor`. */
export interface RequestExecutorDepsInterface {
  readonly 'context': Context | undefined;
  readonly 'deadlineMs': RequestDeadlineEntity.Type['deadlineMs'] | undefined;
  readonly 'fetchClient': FetchClient;
  readonly 'retry': Retry;
  readonly 'signal': Signal;
  readonly 'timing': Timing | undefined;
}
