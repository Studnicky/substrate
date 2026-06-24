import type {
  ErrorClassificationType,
  ErrorClassifierInterface
} from '../../interfaces/index.js';

import { matchers } from './matchers.js';

/**
 * Abstract base class for error classification
 *
 * Provides a reusable pattern for implementing error classification logic
 * that can be used with retry mechanisms. Extend this class to create
 * protocol-specific or domain-specific error classifiers.
 *
 * @example HTTP Error Classifier
 * ```typescript
 * class HttpErrorClassifier extends ErrorClassifier {
 *   classify(error: Error, attemptNumber: number): ErrorClassificationType {
 *     if ('status' in error) {
 *       const status = (error as { status: number }).status;
 *
 *       if (status === 429) {
 *         return { retryable: true, reason: 'Rate limited' };
 *       }
 *
 *       if (status >= 500) {
 *         return { retryable: true, reason: 'Server error' };
 *       }
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
 *   classify(error: Error, attemptNumber: number): ErrorClassificationType {
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
  static readonly ARRAY_MATCHERS = matchers.array;
  static readonly BOOLEAN_MATCHERS = matchers.boolean;
  static readonly DATABASE_MATCHERS = matchers.database;
  static readonly HTTP_MATCHERS = matchers.http;
  static readonly INSTANCE_MATCHERS = matchers.instance;
  static readonly LOGIC_MATCHERS = matchers.logic;
  static readonly NETWORK_MATCHERS = matchers.network;
  /**
   * Composable matcher utilities for flexible property checking
   *
   * These matchers can be used with hasProperty() for expressive error classification.
   *
   * @example Using matchers
   * ```typescript
   * class HttpErrorClassifier extends ErrorClassifier {
   *   classify(error: Error): ErrorClassificationType {
   *     const { HTTP_MATCHERS, NETWORK_MATCHERS, LOGIC_MATCHERS } = ErrorClassifier;
   *
   *     // Use domain-specific matchers
   *     if (this.hasProperty(error, 'status', HTTP_MATCHERS.isServerError)) {
   *       return this.retryable('Server error');
   *     }
   *
   *     // Compose with logical operators
   *     if (this.hasProperty(error, 'status', LOGIC_MATCHERS.or(HTTP_MATCHERS.isRateLimited, HTTP_MATCHERS.isGatewayError))) {
   *       return this.retryable('Retryable HTTP error');
   *     }
   *
   *     // Use network matchers
   *     if (this.hasProperty(error, 'code', NETWORK_MATCHERS.isConnectionError)) {
   *       return this.retryable('Connection error');
   *     }
   *
   *     return this.nonRetryable('Unknown error');
   *   }
   * }
   * ```
   */
  static readonly NUMBER_MATCHERS = matchers.number;
  static readonly OBJECT_MATCHERS = matchers.object;
  static readonly PROTO_MATCHERS = matchers.proto;
  static readonly STRING_MATCHERS = matchers.string;

  /**
   * Classify an error to determine if it should be retried
   *
   * @param error - The error that occurred
   * @param attemptNumber - Current attempt number (0-indexed)
   * @returns Classification result indicating whether to retry
   */
  abstract classify(error: Error, attemptNumber: number): ErrorClassificationType;

  /**
   * Helper: Check if error has a property, optionally with a specific value or matching a predicate
   *
   * This is the most flexible property checking method and can replace specialized methods
   * like hasStatus and hasStatusInRange for most use cases.
   *
   * @param error - The error to check
   * @param propertyName - Name of the property to check
   * @returns True if property exists
   *
   * @example Check property existence
   * ```typescript
   * if (this.hasProperty(error, 'status')) {
   *   // error has a status property
   * }
   * ```
   */
  protected hasProperty(error: Error, propertyName: string): boolean;
  /**
   * Helper: Check if error has a property with a specific value
   *
   * @param error - The error to check
   * @param propertyName - Name of the property to check
   * @param value - Expected value (strict equality check)
   * @returns True if property exists with the specified value
   *
   * @example Check specific value
   * ```typescript
   * if (this.hasProperty(error, 'status', 404)) {
   *   return this.nonRetryable('Not found');
   * }
   * ```
   */
  protected hasProperty<T>(error: Error, propertyName: string, value: T): boolean;
  /**
   * Helper: Check if error has a property matching any of multiple values
   *
   * @param error - The error to check
   * @param propertyName - Name of the property to check
   * @param values - Array of acceptable values
   * @returns True if property exists with any of the specified values
   *
   * @example Check multiple values
   * ```typescript
   * if (this.hasProperty(error, 'status', [502, 503, 504])) {
   *   return this.retryable('Gateway error');
   * }
   * ```
   */
  protected hasProperty<T>(error: Error, propertyName: string, values: T[]): boolean;
  /**
   * Helper: Check if error has a property whose value satisfies a predicate
   *
   * @param error - The error to check
   * @param propertyName - Name of the property to check
   * @param predicate - Function to test the property value
   * @returns True if property exists and predicate returns true
   *
   * @example Check with predicate
   * ```typescript
   * if (this.hasProperty(error, 'status', (status) => status >= 500)) {
   *   return this.retryable('Server error');
   * }
   * ```
   *
   * @example Complex predicate with type
   * ```typescript
   * if (this.hasProperty(error, 'retryAfter', (val): val is number => typeof val === 'number' && val > 0)) {
   *   return this.retryable('Rate limited');
   * }
   * ```
   */
  protected hasProperty<T>(error: Error, propertyName: string, predicate: (value: T) => boolean): boolean;
  protected hasProperty<T>(
    error: Error,
    propertyName: string,
    matcher?: ((value: T) => boolean) | T | T[]
  ): boolean {
    if (!(propertyName in error)) {
      return false;
    }

    type ErrorWithDynamicProperty = Error & Record<string, unknown>;
    const value = (error as ErrorWithDynamicProperty)[propertyName] as T;

    if (matcher === undefined) {
      return true;
    }

    if (typeof matcher === 'function') {
      return (matcher as (value: T) => boolean)(value);
    }

    if (Array.isArray(matcher)) {
      return matcher.includes(value);
    }

    return value === matcher;
  }

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
    const msg = error.message.toLowerCase();
    const lowerPatterns = patterns.map((pattern) => {
      const result = pattern.toLowerCase();
      return result;
    });

    return lowerPatterns.some((pattern) => {
      const result = msg.includes(pattern);
      return result;
    });
  }

  /**
   * Helper: Create a non-retryable classification
   *
   * @param reason - Reason for classification
   * @returns Non-retryable error classification
   */
  protected nonRetryable(reason: string): ErrorClassificationType {
    const classification: ErrorClassificationType = {
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
  protected retryable(reason: string): ErrorClassificationType {
    const classification: ErrorClassificationType = {
      'reason': reason,
      'retryable': true
    };
    return classification;
  }
}
