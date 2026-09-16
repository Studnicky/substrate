import type { FetchClientInterface } from '@studnicky/fetch/interfaces';
import type { OperationPipelineInterface } from '@studnicky/pipeline/interfaces';
import type { RetryInterface } from '@studnicky/retry/interfaces';
import type { SignalInterface } from '@studnicky/signal/interfaces';

import type { RequestExecutorConfigDataEntity } from '../entities/RequestExecutorConfigDataEntity.js';
import type { RequestExecutorOperationContextInterface } from './RequestExecutorOperationContextInterface.js';
import type { RequestScopeFactoryInterface } from './RequestScopeFactoryInterface.js';

/**
 * Configuration accepted by `RequestExecutor.create()`.
 */
export interface RequestExecutorConfigInterface {
  /** Default deadline in milliseconds for calls without a per-call deadline. */
  readonly 'deadlineMs'?: RequestExecutorConfigDataEntity.Type['deadlineMs'];

  /** HTTP client implementation for this runtime. */
  readonly 'fetchClient': FetchClientInterface;

  /** Optional policies surrounding one fully observed request execution. */
  readonly 'pipeline'?: OperationPipelineInterface<RequestExecutorOperationContextInterface>;

  /** Retry runtime port used to execute the callback. */
  readonly 'retry': RetryInterface;

  /**
   * A scope factory. Request execution only creates a scope when supplied.
   */
  readonly 'scope'?: RequestScopeFactoryInterface;

  /** Signal runtime port used to compose caller cancellation and deadlines. */
  readonly 'signal': SignalInterface;
}
