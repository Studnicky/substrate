/**
 * Composable matcher utilities for flexible property checking
 *
 * These matchers can be used with ErrorClassifier.hasProperty() to create
 * expressive, reusable property matching logic.
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
 * Type guard matcher factory
 */
class TypeGuardFactory {
  /**
   * Type guard matcher - ensures value is of specific type
   */
  public static isType<T>(type: string): (value: unknown) => value is T {
    const result: (value: unknown) => value is T = (value: unknown): value is T => {const typeMatches = typeof value === type; return typeMatches;};
    return result;
  }
}

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
   * @example
   * ```typescript
   * hasProperty(error, 'status', number.inRange(500, 599))
   * ```
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
 * Object matchers
 */
const ObjectMatchers = Object.freeze({
  /**
   * Check if object has all properties
   */
  'hasAllProperties': (...propertyNames: string[]) =>
  {return (value: Record<string, unknown>): boolean => {
    const propertyNamesLength = propertyNames.length;
    for (let propertyNameIndex = 0; propertyNameIndex < propertyNamesLength; propertyNameIndex += 1) {
      const propertyName = propertyNames[propertyNameIndex];
      if (propertyName === undefined || !(propertyName in value)) {
        return false;
      }
    }
    return true;
  };},

  /**
   * Check if object has any of the properties
   */
  'hasAnyProperty': (...propertyNames: string[]) =>
  {return (value: Record<string, unknown>): boolean => {
    const propertyNamesLength = propertyNames.length;
    for (let propertyNameIndex = 0; propertyNameIndex < propertyNamesLength; propertyNameIndex += 1) {
      const propertyName = propertyNames[propertyNameIndex];
      if (propertyName !== undefined && propertyName in value) {
        return true;
      }
    }
    return false;
  };},

  /**
   * Check if object has property
   */
  'hasProperty': (propertyName: string) =>
  {return (value: Record<string, unknown>): boolean => {const result = propertyName in value; return result;};}
});

/**
 * Logical combinators for composing matchers
 */
const LogicMatchers = Object.freeze({
  /**
   * Combine matchers with AND logic
   *
   * @example
   * ```typescript
   * hasProperty(error, 'status',
   *   logic.and(
   *     number.gte(400),
   *     number.lessThan(500)
   *   )
   * )
   * ```
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
   * @example
   * ```typescript
   * hasProperty(error, 'status', logic.not(number.inRange(200, 299)))
   * ```
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
   * @example
   * ```typescript
   * hasProperty(error, 'status',
   *   logic.or(
   *     number.inRange(500, 599),
   *     number.oneOf(429)
   *   )
   * )
   * ```
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
 * Instance and type checking matchers
 */
const InstanceMatchers = Object.freeze({
  /**
   * Check if value is an Error instance (any Error type)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.isError)
   * ```
   */
  'isError': (value: unknown): value is Error => {
    const result = value instanceof Error;
    return result;
  },

  /**
   * Check constructor name (useful for cross-realm checks)
   *
   * Works across different execution contexts where instanceof might fail
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.named('TypeError'))
   * ```
   */
  'named': (name: string) => {return (value: unknown): boolean => {
    if (value === null || value === undefined || typeof value !== 'object') { return false; }

    const result = (value as { 'constructor'?: { 'name'?: string } }).constructor?.name === name;
    return result;
  };},

  /**
   * Check if constructor name matches any of the provided names
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.namedAny('TypeError', 'RangeError'))
   * ```
   */
  'namedAny': (...names: string[]) => {return (value: unknown): boolean => {
    if (value === null || value === undefined || typeof value !== 'object') { return false; }

    const constructorName = (value as { 'constructor'?: { 'name'?: string } }).constructor?.name ?? '';

    const result = names.includes(constructorName);
    return result;
  };},

  /**
   * Check if value is an instance of a constructor
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.of(TypeError))
   * hasProperty(error, 'originalError', instance.of(Error))
   * ```
   */
  'of': <T>(constructor: new (...argumentList: never[]) => T) => {
    return (value: unknown): value is T => {
      const result = value instanceof constructor;
      return result;
    };
  },

  /**
   * Check if value is an instance of any of the provided constructors
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.ofAny(TypeError, RangeError, ReferenceError))
   * ```
   */
  'ofAny': <T>(...constructors: (new (...argumentList: never[]) => T)[]) => {
    const result = (value: unknown): value is T => {
      const matches = constructors.some((targetConstructor) => {
        const instanceMatches = value instanceof targetConstructor;
        return instanceMatches;
      });
      return matches;
    };
    return result;
  }
});

/**
 * Prototype checking matchers
 */
class ProtoMatcherFactory {
  public static hasAllMethods(...methodNames: string[]) {
    return (value: unknown): boolean => {
      if (value === null || value === undefined) { return false; }

      const result = methodNames.every((name) => {
        const hasMethod = typeof Reflect.get(value, name) === 'function';
        return hasMethod;
      });
      return result;
    };
  }

  public static hasAnyMethod(...methodNames: string[]) {
    return (value: unknown): boolean => {
      if (value === null || value === undefined) { return false; }

      const result = methodNames.some((name) => {
        const hasMethod = typeof Reflect.get(value, name) === 'function';
        return hasMethod;
      });
      return result;
    };
  }

  public static hasMethod(methodName: string) {
    return (value: unknown): boolean => {
      if (value === null || value === undefined) { return false; }

      const result = typeof Reflect.get(value, methodName) === 'function';
      return result;
    };
  }

  public static hasProperty(propertyName: string) {
    return (value: unknown): boolean => {
      if (value === null || value === undefined) { return false; }

      const result = typeof value === 'object' && propertyName in value;
      return result;
    };
  }

  public static isAsyncIterable(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const result = typeof Reflect.get(value, Symbol.asyncIterator) === 'function';
    return result;
  }

  public static isCallable(value: unknown): value is (...argumentList: unknown[]) => unknown {
    const result = typeof value === 'function';
    return result;
  }

  public static isIterable(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const result = typeof Reflect.get(value, Symbol.iterator) === 'function';
    return result;
  }
}

const ProtoMatchers = Object.freeze({
  /**
   * Check if value's prototype has all specified methods
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.hasAllMethods('read', 'write', 'pipe'))
   * ```
   */
  'hasAllMethods': ProtoMatcherFactory.hasAllMethods,

  /**
   * Check if value's prototype has any of the specified methods
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.hasAnyMethod('read', 'pipe'))
   * ```
   */
  'hasAnyMethod': ProtoMatcherFactory.hasAnyMethod,

  /**
   * Check if value's prototype has a specific method
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', prototype.hasMethod('toString'))
   * hasProperty(error, 'stream', prototype.hasMethod('pipe'))
   * ```
   */
  'hasMethod': ProtoMatcherFactory.hasMethod,

  /**
   * Check if value has a specific property (not just method)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'metadata', prototype.hasProperty('requestId'))
   * ```
   */
  'hasProperty': ProtoMatcherFactory.hasProperty,

  /**
   * Check if value is async iterable (has Symbol.asyncIterator)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.isAsyncIterable)
   * ```
   */
  'isAsyncIterable': ProtoMatcherFactory.isAsyncIterable,

  /**
   * Check if value is callable (is a function)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'retry', prototype.isCallable)
   * ```
   */
  'isCallable': ProtoMatcherFactory.isCallable,

  /**
   * Check if value is iterable (has Symbol.iterator)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'items', prototype.isIterable)
   * ```
   */
  'isIterable': ProtoMatcherFactory.isIterable
});

/**
 * Aggregated matchers export matching filename
 */
const matchers = Object.freeze({
  'array': ArrayMatchers,
  'boolean': BooleanMatchers,
  'database': DatabaseMatchers,
  'http': HttpMatchers,
  'instance': InstanceMatchers,
  'isType': TypeGuardFactory.isType,
  'logic': LogicMatchers,
  'network': NetworkMatchers,
  'number': NumberMatchers,
  'object': ObjectMatchers,
  'proto': ProtoMatchers,
  'string': StringMatchers
});

export { matchers };
