import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorClassifierInterface } from '../interfaces/index.js';

/**
 * Abstract base class for error classification
 *
 * Provides a reusable pattern for implementing error classification logic
 * that can be used with retry mechanisms. Extend this class to create
 * protocol-specific or domain-specific error classifiers.
 *
 * @example Message-based error classifier
 * ```typescript
 * class NetworkErrorClassifier extends ErrorClassifier {
 *   classify(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
 *     if (error.message.includes('connection refused')) {
 *       return this.retryable('Connection refused');
 *     }
 *
 *     return { retryable: false };
 *   }
 * }
 * ```
 *
 * @example SPARQL Error Classifier
 * ```typescript
 * class SparqlErrorClassifier extends ErrorClassifier {
 *   constructor(private readonly adapterName: string) {
 *     super();
 *   }
 *
 *   classify(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
 *     const msg = error.message.toLowerCase();
 *
 *     if (msg.includes('transaction') || msg.includes('503')) {
 *       return { retryable: true, reason: `${this.adapterName} transient error` };
 *     }
 *
 *     if (msg.includes('syntax')) {
 *       return { retryable: false, reason: 'SPARQL syntax error' };
 *     }
 *
 *     return { retryable: false };
 *   }
 * }
 * ```
 */
export abstract class ErrorClassifier implements ErrorClassifierInterface {
  protected constructor() {}

  /**
   * Classify an error to determine if it should be retried
   *
   * @param error - The error that occurred
   * @param attemptNumber - Current attempt number (0-indexed)
   * @returns Classification result indicating whether to retry
   */
  abstract classify(error: Error, attemptNumber: number): ErrorClassificationEntity.Type;

  /**
   * Helper: Check if error message contains any of the specified strings (case-insensitive)
   *
   * @param error - The error to check
   * @param patterns - String patterns to search for
   * @returns True if error message contains any pattern
   *
   * @example
   * ```typescript
   * if (this.messageContains(error, 'timeout', 'connection refused')) {
   *   return this.retryable('Network error');
   * }
   * ```
   */
  protected messageContains(error: Error, ...patterns: string[]): boolean {
    const message = error.message.toLowerCase();
    const patternCount = patterns.length;
    for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
      const pattern = patterns[patternIndex];
      if (pattern !== undefined && message.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper: Create a non-retryable classification
   *
   * @param reason - Reason for classification
   * @returns Non-retryable error classification
   */
  protected nonRetryable(reason: string): ErrorClassificationEntity.Type {
    const classification: ErrorClassificationEntity.Type = {
      'reason': reason,
      'retryable': false
    };
    return classification;
  }

  /**
   * Helper: Create a retryable classification
   *
   * @param reason - Reason for classification
   * @returns Retryable error classification
   */
  protected retryable(reason: string): ErrorClassificationEntity.Type {
    const classification: ErrorClassificationEntity.Type = {
      'reason': reason,
      'retryable': true
    };
    return classification;
  }
}
