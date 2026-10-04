/** customClassifier — supply a domain error classifier to Retry. */

import type { ErrorClassificationEntity } from '@studnicky/errors/entities';

import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { Retry } from '../src/retry/index.js';
import { CustomClassifierFixtures } from './retry-fixtures/customClassifierFixtures.js';

class DatabaseError extends BaseError {
  public override readonly name: string = 'DatabaseError';

  constructor(message: string, readonly isDeadlock: boolean) {
    super({
      'code': 'retry.database',
      'message': message
    });
  }
}

class DatabaseClassifier {
  static classify(error: Error): ErrorClassificationEntity.Type {
    if (error instanceof DatabaseError && error.isDeadlock) {
      return { 'reason': 'Transient deadlock', 'retryable': true };
    }
    return { 'reason': 'Permanent database error', 'retryable': false };
  }
}

class AttemptCounter {
  #count = 0;

  next(): number {
    this.#count++;
    return this.#count;
  }
}

// #region usage
const counter = new AttemptCounter();
const retry = Retry.create({
  'errorClassifier': DatabaseClassifier.classify,
  'maximumRetries': 3
});

const result = await retry.execute(() => {
  const attemptNumber = counter.next();
  if (attemptNumber <= CustomClassifierFixtures.failUntil) {
    throw new DatabaseError(`Deadlock on attempt ${attemptNumber}`, true);
  }
  const attemptResult = Promise.resolve(`query succeeded on attempt ${attemptNumber}`);
  return attemptResult;
});

console.log(`Result: ${result}`);
console.log('Stats:', retry.getStats());
// #endregion usage

assert.equal(retry.getStats().totalRetries, CustomClassifierFixtures.failUntil);
assert.equal(retry.getStats().successfulRequests, 1);

console.log('customClassifier: all assertions passed');
