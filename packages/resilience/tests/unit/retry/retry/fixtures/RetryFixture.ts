import type { RetryConfigEntity } from '../../../../../src/retry/entities/RetryConfigEntity.js';
import type { RetryConfigInterface } from '../../../../../src/retry/interfaces/RetryConfigInterface.js';

import { Retry } from '../../../../../src/retry/index.js';
import { RetryClassifier } from './RetryClassifier.js';

/** Builds retry instances with the private test classifier. */
export class RetryFixture {
  static create(options: RetryConfigEntity.InputType = {}): Retry {
    const result = Retry.create(this.options(options));
    return result;
  }

  static options(options: RetryConfigEntity.InputType = {}): RetryConfigInterface {
    const result: RetryConfigInterface = { 'errorClassifier': RetryClassifier.retryable, ...options };
    return result;
  }
}
