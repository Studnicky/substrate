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
const NumberMatchers = Object.freeze({
  /**
   * Check if number is greater than value
   */
  'greaterThan': (minimum: number) => {const result: (value: number) => boolean = (value: number): boolean => {const comparisonResult = value > minimum; return comparisonResult;}; return result;},

  /**
   * Check if number is greater than or equal to value
   */
  'gte': (minimum: number) => {const result: (value: number) => boolean = (value: number): boolean => {const comparisonResult = value >= minimum; return comparisonResult;}; return result;},

  /**
   * Check if number is in range (inclusive)
   *
   */
  'inRange': (minimum: number, maximum: number) => {const result: (value: number) => boolean = (value: number): boolean => {const comparisonResult = value >= minimum && value <= maximum; return comparisonResult;}; return result;},

  /**
   * Check if number is less than value
   */
  'lessThan': (maximum: number) => {const result: (value: number) => boolean = (value: number): boolean => {const comparisonResult = value < maximum; return comparisonResult;}; return result;},

  /**
   * Check if number is less than or equal to value
   */
  'lte': (maximum: number) => {const result: (value: number) => boolean = (value: number): boolean => {const comparisonResult = value <= maximum; return comparisonResult;}; return result;},

  /**
   * Check if number equals any of the provided values
   */
  'oneOf': (...values: number[]) => {return (value: number): boolean => {
    const length = values.length;
    for (let index = 0; index < length; index += 1) {
      if (values[index] === value) {
        return true;
      }
    }
    return false;
  };}
});

/**
 * String matchers
 */
const StringMatchers = Object.freeze({
  /**
   * Check if string contains substring (case-sensitive)
   */
  'contains': (substring: string) => {return (value: string): boolean => {
    const result = value.indexOf(substring) !== -1;
    return result;
  };},

  /**
   * Check if string contains substring (case-insensitive)
   */
  'containsIgnoreCase': (substring: string) => {
    const lowerSubstring = substring.toLowerCase();

    return (value: string): boolean => {
      const result = value.toLowerCase().indexOf(lowerSubstring) !== -1;
      return result;
    };
  },

  /**
   * Check if string ends with suffix (case-sensitive)
   */
  'endsWith': (suffix: string) => {return (value: string): boolean => {
    const result = value.length >= suffix.length && value.slice(value.length - suffix.length) === suffix;
    return result;
  };},

  /**
   * Check if string length is in range
   */
  'lengthInRange': (minimum: number, maximum: number) => {return (value: string): boolean =>
  {const result = value.length >= minimum && value.length <= maximum; return result;};},

  /**
   * Check if string matches regex pattern
   */
  'matches': (pattern: RegExp) => {return (value: string): boolean => {
    const result = pattern.test(value) === true;
    return result;
  };},

  /**
   * Check if string is not empty
   */
  'notEmpty': (value: string): boolean => {
    const result = value.length > EMPTY_LENGTH;
    return result;
  },

  /**
   * Check if string equals any of the provided values
   */
  'oneOf': (...values: string[]) => {return (value: string): boolean => {
    const length = values.length;
    for (let index = 0; index < length; index += 1) {
      if (values[index] === value) {
        return true;
      }
    }
    return false;
  };},

  /**
   * Check if string starts with prefix (case-sensitive)
   */
  'startsWith': (prefix: string) => {return (value: string): boolean => {
    const result = value.indexOf(prefix) === 0;
    return result;
  };},

  /**
   * Check if string starts with prefix (case-insensitive)
   */
  'startsWithIgnoreCase': (prefix: string) => {
    const lowerPrefix = prefix.toLowerCase();

    return (value: string): boolean => {
      const result = value.toLowerCase().indexOf(lowerPrefix) === 0;
      return result;
    };
  }
});

/**
 * Boolean matchers
 */
const BooleanMatchers = Object.freeze({
  /**
   * Check if value is false
   */
  'isFalse': (value: boolean): boolean => {
    const result = !value;
    return result;
  },

  /**
   * Check if value is true
   */
  'isTrue': (value: boolean): boolean => {
    const result = value;
    return result;
  }
});

/**
 * Array matchers
 */
const ArrayMatchers = Object.freeze({
  /**
   * Check if array contains value
   */
  'contains': <T>(searchValue: T) => {return (value: T[]): boolean => {
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      if (value[index] === searchValue) {
        return true;
      }
    }
    return false;
  };},

  /**
   * Check if array contains all of the values
   */
  'containsAll': <T>(...searchValues: T[]) => {return (value: T[]): boolean => {
    const valuesSet = new Set(value);
    const requiredValues = new Set(searchValues);
    for (const requiredValue of requiredValues) {
      if (!valuesSet.has(requiredValue)) {
        return false;
      }
    }
    return true;
  };},

  /**
   * Check if array contains any of the values
   */
  'containsAny': <T>(...searchValues: T[]) => {return (value: T[]): boolean => {
    const valuesSet = new Set(value);
    const requiredValues = new Set(searchValues);
    for (const requiredValue of requiredValues) {
      if (valuesSet.has(requiredValue)) {
        return true;
      }
    }
    return false;
  };},

  /**
   * Check if array length is in range
   */
  'lengthInRange': (minimum: number, maximum: number) => {return <T>(value: T[]): boolean =>
  {const result = value.length >= minimum && value.length <= maximum; return result;};},

  /**
   * Check if array is not empty
   */
  'notEmpty': <T>(value: T[]): boolean => {
    const result = value.length > EMPTY_LENGTH;
    return result;
  }
});

/**
 * Logical combinators for composing matchers
 */
const LogicMatchers = Object.freeze({
  /**
   * Combine matchers with AND logic
   *
   */
  'and': <T>(...predicates: ((value: T) => boolean)[]) => {
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
  },

  /**
   * Negate a matcher
   *
   */
  'not': <T>(predicate: (value: T) => boolean) => {
    return (value: T): boolean => {
      const result = !predicate(value);
      return result;
    };
  },

  /**
   * Combine matchers with OR logic
   *
   */
  'or': <T>(...predicates: ((value: T) => boolean)[]) => {
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
});

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
const DatabaseMatchers = Object.freeze({
  /**
   * Connection errors (Class 08)
   */
  'isConnectionError': StringMatchers.startsWith('08'),

  /**
   * Constraint violations (Class 23)
   */
  'isConstraintViolation': StringMatchers.startsWith('23'),

  /**
   * Deadlock (40001, 40P01)
   */
  'isDeadlock': StringMatchers.oneOf('40001', '40P01'),

  /**
   * Foreign key violation (23503)
   */
  'isForeignKeyViolation': (code: string): boolean => {
    const result = code === '23503';
    return result;
  },

  /**
   * Unique violation (23505)
   */
  'isUniqueViolation': (code: string): boolean => {
    const result = code === '23505';
    return result;
  }
});

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
