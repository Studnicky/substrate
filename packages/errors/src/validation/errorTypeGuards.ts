/**
 * Type guards for common error properties
 *
 * These guards help consumers safely access error properties with proper type narrowing.
 * They are particularly useful when working with ErrorClassifier implementations.
 *
 * Each guard delegates to its matching entity's own `validate` — `isErrorWithStatus` and
 * `ErrorWithStatusEntity.validate` used to be two hand-written copies of the same
 * `typeof candidate.status === 'number'` check that could silently drift apart. The entity's
 * schema is the single source of truth for what "has a status field" means; this file just
 * exposes it under its established `isErrorWithX` names.
 *
 * @example
 * ```typescript
 * import { isErrorWithStatus, isErrorWithRetryAfter } from '@studnicky/errors';
 *
 * class MyClassifier extends ErrorClassifier {
 *   classify(error: Error): ErrorClassificationEntity.Type {
 *     if (isErrorWithStatus(error) && error.status === 429) {
 *       if (isErrorWithRetryAfter(error)) {
 *         return this.retryable('Rate limited', error.retryAfter * 1000);
 *       }
 *       return this.retryable('Rate limited');
 *     }
 *     return this.nonRetryable('Unknown error');
 *   }
 * }
 * ```
 */

import { ErrorWithAddressEntity } from '../entities/ErrorWithAddressEntity.js';
import { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';
import { ErrorWithErrnoEntity } from '../entities/ErrorWithErrnoEntity.js';
import { ErrorWithHostnameEntity } from '../entities/ErrorWithHostnameEntity.js';
import { ErrorWithPortEntity } from '../entities/ErrorWithPortEntity.js';
import { ErrorWithRetryAfterEntity } from '../entities/ErrorWithRetryAfterEntity.js';
import { ErrorWithStatusCodeEntity } from '../entities/ErrorWithStatusCodeEntity.js';
import { ErrorWithStatusEntity } from '../entities/ErrorWithStatusEntity.js';
import { ErrorWithSyscallEntity } from '../entities/ErrorWithSyscallEntity.js';

/**
 * Type guards for common error properties, each delegating to its entity's `validate`.
 */
class ErrorPropertyGuards {
  /** Type guard: Check if error has status property (number). */
  public static isErrorWithStatus(error: Parameters<typeof ErrorWithStatusEntity.validate>[0]): error is ErrorWithStatusEntity.Type {
    const result = ErrorWithStatusEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has statusCode property (number). */
  public static isErrorWithStatusCode(error: Parameters<typeof ErrorWithStatusCodeEntity.validate>[0]): error is ErrorWithStatusCodeEntity.Type {
    const result = ErrorWithStatusCodeEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has code property (string). */
  public static isErrorWithCode(error: Parameters<typeof ErrorWithCodeEntity.validate>[0]): error is ErrorWithCodeEntity.Type {
    const result = ErrorWithCodeEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has retryAfter property (number). */
  public static isErrorWithRetryAfter(error: Parameters<typeof ErrorWithRetryAfterEntity.validate>[0]): error is ErrorWithRetryAfterEntity.Type {
    const result = ErrorWithRetryAfterEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has errno property (number). */
  public static isErrorWithErrno(error: Parameters<typeof ErrorWithErrnoEntity.validate>[0]): error is ErrorWithErrnoEntity.Type {
    const result = ErrorWithErrnoEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has syscall property (string). */
  public static isErrorWithSyscall(error: Parameters<typeof ErrorWithSyscallEntity.validate>[0]): error is ErrorWithSyscallEntity.Type {
    const result = ErrorWithSyscallEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has hostname property (string). */
  public static isErrorWithHostname(error: Parameters<typeof ErrorWithHostnameEntity.validate>[0]): error is ErrorWithHostnameEntity.Type {
    const result = ErrorWithHostnameEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has port property (number). */
  public static isErrorWithPort(error: Parameters<typeof ErrorWithPortEntity.validate>[0]): error is ErrorWithPortEntity.Type {
    const result = ErrorWithPortEntity.validate(error);
    return result;
  }

  /** Type guard: Check if error has address property (string). */
  public static isErrorWithAddress(error: Parameters<typeof ErrorWithAddressEntity.validate>[0]): error is ErrorWithAddressEntity.Type {
    const result = ErrorWithAddressEntity.validate(error);
    return result;
  }
}

/**
 * Aggregated export matching filename
 */
const errorTypeGuards = {
  'isErrorWithAddress': ErrorPropertyGuards.isErrorWithAddress,
  'isErrorWithCode': ErrorPropertyGuards.isErrorWithCode,
  'isErrorWithErrno': ErrorPropertyGuards.isErrorWithErrno,
  'isErrorWithHostname': ErrorPropertyGuards.isErrorWithHostname,
  'isErrorWithPort': ErrorPropertyGuards.isErrorWithPort,
  'isErrorWithRetryAfter': ErrorPropertyGuards.isErrorWithRetryAfter,
  'isErrorWithStatus': ErrorPropertyGuards.isErrorWithStatus,
  'isErrorWithStatusCode': ErrorPropertyGuards.isErrorWithStatusCode,
  'isErrorWithSyscall': ErrorPropertyGuards.isErrorWithSyscall
};

export { errorTypeGuards };
