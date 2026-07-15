/**
 * Type guards for common error properties
 *
 * These guards help consumers safely access error properties with proper type narrowing.
 * They are particularly useful when working with ErrorClassifier implementations.
 *
 * Uses Node.js 24's Error.isError() for reliable error detection.
 *
 * @example
 * ```typescript
 * import { isErrorWithStatus, isErrorWithRetryAfter } from '@studnicky/errors';
 *
 * class MyClassifier extends ErrorClassifier {
 *   classify(error: Error): ErrorClassificationType {
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

import type {
  ErrorWithAddressType,
  ErrorWithCodeType,
  ErrorWithErrnoType,
  ErrorWithHostnameType,
  ErrorWithPortType,
  ErrorWithRetryAfterType,
  ErrorWithStatusCodeType,
  ErrorWithStatusType,
  ErrorWithSyscallType
} from '../types/index.js';

/**
 * Check if value is an error or error-like object
 */
class ErrorLikeGuard {
  /**
   * Check if value is an error or error-like object using Node.js 24's Error.isError()
   * Falls back to object check for error-like objects that aren't true Error instances
   */
  public static isErrorOrObjectLike(value: unknown): value is Record<string, unknown> {
    if (Error.isError(value)) {
      return true;
    }

    return typeof value === 'object' && value !== null;
  }
}

/**
 * Type guards for common error properties
 */
class ErrorPropertyGuards {
  /**
   * Type guard: Check if error has status property (number)
   *
   * @example
   * ```typescript
   * if (isErrorWithStatus(error)) {
   *   console.log(error.status); // type-safe access
   * }
   * ```
   */
  public static isErrorWithStatus(error: unknown): error is ErrorWithStatusType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'status' in error
      && typeof error.status === 'number'
    );
  }

  /**
   * Type guard: Check if error has statusCode property (number)
   *
   * @example
   * ```typescript
   * if (isErrorWithStatusCode(error)) {
   *   console.log(error.statusCode); // type-safe access
   * }
   * ```
   */
  public static isErrorWithStatusCode(error: unknown): error is ErrorWithStatusCodeType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'statusCode' in error
      && typeof error.statusCode === 'number'
    );
  }

  /**
   * Type guard: Check if error has code property (string)
   *
   * @example
   * ```typescript
   * if (isErrorWithCode(error)) {
   *   if (error.code === 'ECONNREFUSED') {
   *     // handle connection refused
   *   }
   * }
   * ```
   */
  public static isErrorWithCode(error: unknown): error is ErrorWithCodeType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'code' in error
      && typeof error.code === 'string'
    );
  }

  /**
   * Type guard: Check if error has retryAfter property (number)
   *
   * @example
   * ```typescript
   * if (isErrorWithRetryAfter(error)) {
   *   return this.retryable('Rate limited', error.retryAfter * 1000);
   * }
   * ```
   */
  public static isErrorWithRetryAfter(error: unknown): error is ErrorWithRetryAfterType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'retryAfter' in error
      && typeof error.retryAfter === 'number'
    );
  }

  /**
   * Type guard: Check if error has errno property (number)
   *
   * @example
   * ```typescript
   * if (isErrorWithErrno(error)) {
   *   console.log(error.errno); // type-safe access
   * }
   * ```
   */
  public static isErrorWithErrno(error: unknown): error is ErrorWithErrnoType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'errno' in error
      && typeof error.errno === 'number'
    );
  }

  /**
   * Type guard: Check if error has syscall property (string)
   *
   * @example
   * ```typescript
   * if (isErrorWithSyscall(error)) {
   *   console.log(error.syscall); // type-safe access
   * }
   * ```
   */
  public static isErrorWithSyscall(error: unknown): error is ErrorWithSyscallType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'syscall' in error
      && typeof error.syscall === 'string'
    );
  }

  /**
   * Type guard: Check if error has hostname property (string)
   *
   * @example
   * ```typescript
   * if (isErrorWithHostname(error)) {
   *   console.log(error.hostname); // type-safe access
   * }
   * ```
   */
  public static isErrorWithHostname(error: unknown): error is ErrorWithHostnameType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'hostname' in error
      && typeof error.hostname === 'string'
    );
  }

  /**
   * Type guard: Check if error has port property (number)
   *
   * @example
   * ```typescript
   * if (isErrorWithPort(error)) {
   *   console.log(error.port); // type-safe access
   * }
   * ```
   */
  public static isErrorWithPort(error: unknown): error is ErrorWithPortType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'port' in error
      && typeof error.port === 'number'
    );
  }

  /**
   * Type guard: Check if error has address property (string)
   *
   * @example
   * ```typescript
   * if (isErrorWithAddress(error)) {
   *   console.log(error.address); // type-safe access
   * }
   * ```
   */
  public static isErrorWithAddress(error: unknown): error is ErrorWithAddressType {
    return (
      ErrorLikeGuard.isErrorOrObjectLike(error)
      && 'address' in error
      && typeof error.address === 'string'
    );
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
