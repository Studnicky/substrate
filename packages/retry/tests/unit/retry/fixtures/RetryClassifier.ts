import type { ErrorClassificationEntity } from '@studnicky/errors/entities';

export class RetryClassifier {
  static nonRetryable(): ErrorClassificationEntity.Type {
    return { 'reason': 'fatal', 'retryable': false };
  }

  static retryable(): ErrorClassificationEntity.Type {
    return { 'retryable': true };
  }
}
