import {
  rejects,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { ErrorClassificationEntity } from '@studnicky/errors';
import type { RetryCallStateType } from '../../../src/types/RetryCallStateType.js';

import { Retry } from '../../../src/retry/index.js';
import {
  MaxRetriesExceededError,
  NonRetryableError
} from '../../../src/errors/index.js';

class RetryableClassifier {
  classify(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { 'retryable': true };
  }
}

class NonRetryableClassifier {
  classify(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { 'reason': 'fatal', 'retryable': false };
  }
}

it('a throwing onAttempt hook does not replace a successful execute() result', async () => {
  class ThrowingAttemptRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onAttempt(): void {
      throw new Error('onAttempt boom');
    }
  }

  const retry = new ThrowingAttemptRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});

it('a throwing onSuccess hook does not replace a successful execute() result', async () => {
  class ThrowingSuccessRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onSuccess(): void {
      throw new Error('onSuccess boom');
    }
  }

  const retry = new ThrowingSuccessRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});

it('a throwing onRetryableError hook does not replace a later successful retry', async () => {
  class ThrowingRetryableErrorRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onRetryableError(): void {
      throw new Error('onRetryableError boom');
    }
  }

  const retry = new ThrowingRetryableErrorRetry({
    'errorClassifier': new RetryableClassifier(),
    'maxRetries': 2
  });

  let attempts = 0;
  const result = await retry.execute(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error('transient');
    }
    return 'recovered';
  });

  strictEqual(result, 'recovered');
  strictEqual(attempts, 2);
});

it('a throwing onGiveUp hook does not replace the canonical non-retryable failure', async () => {
  class ThrowingGiveUpRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onGiveUp(): void {
      throw new Error('onGiveUp boom');
    }
  }

  const retry = new ThrowingGiveUpRetry({
    'errorClassifier': new NonRetryableClassifier(),
    'maxRetries': 1
  });

  await rejects(
    () => retry.execute(async () => { throw new Error('fatal'); }),
    NonRetryableError
  );
});

it('a throwing enterCall hook does not replace a successful execute() result', async () => {
  class ThrowingEnterCallRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override enterCall(_to: RetryCallStateType, _from: RetryCallStateType): void {
      throw new Error('enterCall boom');
    }
  }

  const retry = new ThrowingEnterCallRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});

it('a throwing onGiveUp hook does not replace exhausted retry failure', async () => {
  class ThrowingExhaustedGiveUpRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onGiveUp(): void {
      throw new Error('onGiveUp boom');
    }
  }

  const retry = new ThrowingExhaustedGiveUpRetry({
    'errorClassifier': new RetryableClassifier(),
    'maxRetries': 0
  });

  await rejects(
    () => retry.execute(async () => { throw new Error('still failing'); }),
    MaxRetriesExceededError
  );
});
