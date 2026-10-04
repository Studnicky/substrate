/**
 * Composable matcher utilities for flexible property checking
 *
 * These matchers compose checks over values whose type is already established.
 */

import {
  EMPTY_LENGTH,
  HTTP_CLIENT_ERROR_END,
  HTTP_CLIENT_ERROR_START,
  HTTP_INFORMATIONAL_END,
  HTTP_INFORMATIONAL_START,
  HTTP_REDIRECT_END,
  HTTP_REDIRECT_START,
  HTTP_REQUEST_TIMEOUT,
  HTTP_SERVER_ERROR_END,
  HTTP_SERVER_ERROR_START,
  HTTP_SUCCESS_END,
  HTTP_SUCCESS_START
} from '../constants/ClassifierConstants.js';
import { HttpStatus } from '../constants/index.js';

/**
 * Number matchers
 */
class NumberMatchers {
  /**
   * Check if number is greater than value
   */
  public static greaterThan(minimum: number): (value: number) => boolean {
    const result: (value: number) => boolean = (value: number): boolean => {
      const comparisonResult = value > minimum;
      return comparisonResult;
    };
    return result;
  }

  /**
   * Check if number is greater than or equal to value
   */
  public static gte(minimum: number): (value: number) => boolean {
    const result: (value: number) => boolean = (value: number): boolean => {
      const comparisonResult = value >= minimum;
      return comparisonResult;
    };
    return result;
  }

  /**
   * Check if number is in range (inclusive)
   */
  public static inRange(minimum: number, maximum: number): (value: number) => boolean {
    const result: (value: number) => boolean = (value: number): boolean => {
      const comparisonResult = value >= minimum && value <= maximum;
      return comparisonResult;
    };
    return result;
  }

  /**
   * Check if number is less than value
   */
  public static lessThan(maximum: number): (value: number) => boolean {
    const result: (value: number) => boolean = (value: number): boolean => {
      const comparisonResult = value < maximum;
      return comparisonResult;
    };
    return result;
  }

  /**
   * Check if number is less than or equal to value
   */
  public static lte(maximum: number): (value: number) => boolean {
    const result: (value: number) => boolean = (value: number): boolean => {
      const comparisonResult = value <= maximum;
      return comparisonResult;
    };
    return result;
  }

  /**
   * Check if number equals any of the provided values
   */
  public static oneOf(...values: number[]): (value: number) => boolean {
    return (value: number): boolean => {
      const length = values.length;
      for (let index = 0; index < length; index += 1) {
        if (values[index] === value) {
          return true;
        }
      }
      return false;
    };
  }
}
Object.freeze(NumberMatchers);

/**
 * String matchers
 */
class StringMatchers {
  /**
   * Check if string contains substring (case-sensitive)
   */
  public static contains(substring: string): (value: string) => boolean {
    return (value: string): boolean => {
      const result = value.indexOf(substring) !== -1;
      return result;
    };
  }

  /**
   * Check if string contains substring (case-insensitive)
   */
  public static containsIgnoreCase(substring: string): (value: string) => boolean {
    const lowerSubstring = substring.toLowerCase();
    return (value: string): boolean => {
      const result = value.toLowerCase().indexOf(lowerSubstring) !== -1;
      return result;
    };
  }

  /**
   * Check if string ends with suffix (case-sensitive)
   */
  public static endsWith(suffix: string): (value: string) => boolean {
    return (value: string): boolean => {
      const result = value.length >= suffix.length && value.slice(value.length - suffix.length) === suffix;
      return result;
    };
  }

  /**
   * Check if string length is in range
   */
  public static lengthInRange(minimum: number, maximum: number): (value: string) => boolean {
    return (value: string): boolean => {
      const result = value.length >= minimum && value.length <= maximum;
      return result;
    };
  }

  /**
   * Check if string matches regex pattern
   */
  public static matches(pattern: RegExp): (value: string) => boolean {
    return (value: string): boolean => {
      const result = pattern.test(value) === true;
      return result;
    };
  }

  /**
   * Check if string is not empty
   */
  public static notEmpty(value: string): boolean {
    const result = value.length > EMPTY_LENGTH;
    return result;
  }

  /**
   * Check if string equals any of the provided values
   */
  public static oneOf(...values: string[]): (value: string) => boolean {
    return (value: string): boolean => {
      const length = values.length;
      for (let index = 0; index < length; index += 1) {
        if (values[index] === value) {
          return true;
        }
      }
      return false;
    };
  }

  /**
   * Check if string starts with prefix (case-sensitive)
   */
  public static startsWith(prefix: string): (value: string) => boolean {
    return (value: string): boolean => {
      const result = value.indexOf(prefix) === 0;
      return result;
    };
  }

  /**
   * Check if string starts with prefix (case-insensitive)
   */
  public static startsWithIgnoreCase(prefix: string): (value: string) => boolean {
    const lowerPrefix = prefix.toLowerCase();
    return (value: string): boolean => {
      const result = value.toLowerCase().indexOf(lowerPrefix) === 0;
      return result;
    };
  }
}
Object.freeze(StringMatchers);

/**
 * Boolean matchers
 */
class BooleanMatchers {
  /**
   * Check if value is false
   */
  public static isFalse(value: boolean): boolean {
    const result = !value;
    return result;
  }

  /**
   * Check if value is true
   */
  public static isTrue(value: boolean): boolean {
    const result = value === true;
    return result;
  }
}
Object.freeze(BooleanMatchers);

/**
 * Array matchers
 */
class ArrayMatchers {
  /**
   * Check if array contains value
   */
  public static contains<T>(searchValue: T): (value: T[]) => boolean {
    return (value: T[]): boolean => {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        if (value[index] === searchValue) {
          return true;
        }
      }
      return false;
    };
  }

  /**
   * Check if array contains all of the values
   */
  public static containsAll<T>(...searchValues: T[]): (value: T[]) => boolean {
    return (value: T[]): boolean => {
      const valuesSet = new Set(value);
      const requiredValues = new Set(searchValues);
      for (const requiredValue of requiredValues) {
        if (!valuesSet.has(requiredValue)) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * Check if array contains any of the values
   */
  public static containsAny<T>(...searchValues: T[]): (value: T[]) => boolean {
    return (value: T[]): boolean => {
      const valuesSet = new Set(value);
      const requiredValues = new Set(searchValues);
      for (const requiredValue of requiredValues) {
        if (valuesSet.has(requiredValue)) {
          return true;
        }
      }
      return false;
    };
  }

  /**
   * Check if array length is in range
   */
  public static lengthInRange(minimum: number, maximum: number): (value: unknown[]) => boolean {
    return (value: unknown[]): boolean => {
      const result = value.length >= minimum && value.length <= maximum;
      return result;
    };
  }

  /**
   * Check if array is not empty
   */
  public static notEmpty(value: unknown[]): boolean {
    const result = value.length > EMPTY_LENGTH;
    return result;
  }
}
Object.freeze(ArrayMatchers);

/**
 * Logical combinators for composing matchers
 */
class LogicMatchers {
  /**
   * Combine matchers with AND logic
   */
  public static and<T>(...predicates: ((value: T) => boolean)[]): (value: T) => boolean {
    return (value: T): boolean => {
      const predicatesLength = predicates.length;
      for (let predicateIndex = 0; predicateIndex < predicatesLength; predicateIndex += 1) {
        const predicate = predicates[predicateIndex];
        const predicateMatches = predicate?.(value) ?? false;
        if (!predicateMatches) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * Negate a matcher
   */
  public static not<T>(predicate: (value: T) => boolean): (value: T) => boolean {
    return (value: T): boolean => {
      const result = !predicate(value);
      return result;
    };
  }

  /**
   * Combine matchers with OR logic
   */
  public static or<T>(...predicates: ((value: T) => boolean)[]): (value: T) => boolean {
    return (value: T): boolean => {
      const predicatesLength = predicates.length;
      for (let predicateIndex = 0; predicateIndex < predicatesLength; predicateIndex += 1) {
        const predicate = predicates[predicateIndex];
        if (predicate?.(value) === true) {
          return true;
        }
      }
      return false;
    };
  }
}
Object.freeze(LogicMatchers);

/**
 * Common HTTP status code matchers
 */
const HttpMatchers = Object.freeze({
  /**
   * Authentication errors
   */
  'isAuthError': NumberMatchers.oneOf(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN),

  /**
   * 4xx Client error responses
   */
  'isClientError': NumberMatchers.inRange(HTTP_CLIENT_ERROR_START, HTTP_CLIENT_ERROR_END),

  /**
   * Gateway errors
   */
  'isGatewayError': NumberMatchers.oneOf(HttpStatus.BAD_GATEWAY, HttpStatus.SERVICE_UNAVAILABLE, HttpStatus.GATEWAY_TIMEOUT),

  /**
   * 1xx Informational responses
   */
  'isInformational': NumberMatchers.inRange(HTTP_INFORMATIONAL_START, HTTP_INFORMATIONAL_END),

  /**
   * Rate limiting
   */
  'isRateLimited': (status: number): boolean => {
    const result = status === HttpStatus.TOO_MANY_REQUESTS;
    return result;
  },

  /**
   * 3xx Redirection responses
   */
  'isRedirection': NumberMatchers.inRange(HTTP_REDIRECT_START, HTTP_REDIRECT_END),

  /**
   * Common retryable status codes
   */
  'isRetryable': NumberMatchers.oneOf(
    HTTP_REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT
  ),

  /**
   * 5xx Server error responses
   */
  'isServerError': NumberMatchers.inRange(HTTP_SERVER_ERROR_START, HTTP_SERVER_ERROR_END),

  /**
   * 2xx Success responses
   */
  'isSuccess': NumberMatchers.inRange(HTTP_SUCCESS_START, HTTP_SUCCESS_END)
});

/**
 * Common network error code matchers
 */
const NetworkMatchers = Object.freeze({
  /**
   * Connection errors
   */
  'isConnectionError': StringMatchers.oneOf('ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'),

  /**
   * DNS errors
   */
  'isDNSError': StringMatchers.oneOf('ENOTFOUND', 'EAI_AGAIN'),

  /**
   * Timeout errors
   */
  'isTimeout': StringMatchers.oneOf('ETIMEDOUT', 'ESOCKETTIMEDOUT')
});

/**
 * Common database error matchers (PostgreSQL codes)
 */
class DatabaseMatchers {
  /**
   * Connection errors (Class 08)
   */
  public static readonly isConnectionError: (value: string) => boolean = StringMatchers.startsWith('08');

  /**
   * Constraint violations (Class 23)
   */
  public static readonly isConstraintViolation: (value: string) => boolean = StringMatchers.startsWith('23');

  /**
   * Deadlock (40001, 40P01)
   */
  public static readonly isDeadlock: (value: string) => boolean = StringMatchers.oneOf('40001', '40P01');

  /**
   * Foreign key violation (23503)
   */
  public static isForeignKeyViolation(code: string): boolean {
    const result = code === '23503';
    return result;
  }

  /**
   * Unique violation (23505)
   */
  public static isUniqueViolation(code: string): boolean {
    const result = code === '23505';
    return result;
  }
}
Object.freeze(DatabaseMatchers);

/**
 * Aggregated matchers export matching filename
 */
const matchers = Object.freeze({
  'array': ArrayMatchers,
  'boolean': BooleanMatchers,
  'database': DatabaseMatchers,
  'http': HttpMatchers,
  'logic': LogicMatchers,
  'network': NetworkMatchers,
  'number': NumberMatchers,
  'string': StringMatchers
});

export { matchers };
