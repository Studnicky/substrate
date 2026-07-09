/**
 * Composable matcher utilities for flexible property checking
 *
 * These matchers can be used with ErrorClassifier.hasProperty() to create
 * expressive, reusable property matching logic.
 */

import {
  EMPTY_LENGTH,
  HTTP_BAD_GATEWAY,
  HTTP_CLIENT_ERROR_END,
  HTTP_CLIENT_ERROR_START,
  HTTP_FORBIDDEN,
  HTTP_GATEWAY_TIMEOUT,
  HTTP_INFORMATIONAL_END,
  HTTP_INFORMATIONAL_START,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_REDIRECT_END,
  HTTP_REDIRECT_START,
  HTTP_REQUEST_TIMEOUT,
  HTTP_SERVER_ERROR_END,
  HTTP_SERVER_ERROR_START,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_SUCCESS_END,
  HTTP_SUCCESS_START,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_UNAUTHORIZED
} from '../constants/index.js';

/**
 * Type guard matcher - ensures value is of specific type
 */
const isType = <T>(type: string): ((value: unknown) => value is T) => {
  return (value: unknown): value is T => {return typeof value === type;};
};

/**
 * Number matchers
 */
const NumberMatchers = {
  /**
   * Check if number is greater than value
   */
  'greaterThan': (min: number) => {return (value: number): boolean => {return value > min;};},

  /**
   * Check if number is greater than or equal to value
   */
  'gte': (min: number) => {return (value: number): boolean => {return value >= min;};},

  /**
   * Check if number is in range (inclusive)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'status', number.inRange(500, 599))
   * ```
   */
  'inRange': (min: number, max: number) => {return (value: number): boolean => {return value >= min && value <= max;};},

  /**
   * Check if number is less than value
   */
  'lessThan': (max: number) => {return (value: number): boolean => {return value < max;};},

  /**
   * Check if number is less than or equal to value
   */
  'lte': (max: number) => {return (value: number): boolean => {return value <= max;};},

  /**
   * Check if number equals any of the provided values
   */
  'oneOf': (...values: number[]) => {return (value: number): boolean => { const result = values.includes(value); return result; };}
};

/**
 * String matchers
 */
const StringMatchers = {
  /**
   * Check if string contains substring (case-sensitive)
   */
  'contains': (substring: string) => {return (value: string): boolean => { const result = value.includes(substring); return result; };},

  /**
   * Check if string contains substring (case-insensitive)
   */
  'containsIgnoreCase': (substring: string) => {
    const lowerSubstring = substring.toLowerCase();

    return (value: string): boolean => { const result = value.toLowerCase().includes(lowerSubstring); return result; };
  },

  /**
   * Check if string ends with suffix (case-sensitive)
   */
  'endsWith': (suffix: string) => {return (value: string): boolean => { const result = value.endsWith(suffix); return result; };},

  /**
   * Check if string length is in range
   */
  'lengthInRange': (min: number, max: number) => {return (value: string): boolean =>
  {return value.length >= min && value.length <= max;};},

  /**
   * Check if string matches regex pattern
   */
  'matches': (pattern: RegExp) => {return (value: string): boolean => { const result = pattern.test(value); return result; };},

  /**
   * Check if string is not empty
   */
  'notEmpty': (value: string): boolean => {
    return value.length > EMPTY_LENGTH;
  },

  /**
   * Check if string equals any of the provided values
   */
  'oneOf': (...values: string[]) => {return (value: string): boolean => { const result = values.includes(value); return result; };},

  /**
   * Check if string starts with prefix (case-sensitive)
   */
  'startsWith': (prefix: string) => {return (value: string): boolean => { const result = value.startsWith(prefix); return result; };},

  /**
   * Check if string starts with prefix (case-insensitive)
   */
  'startsWithIgnoreCase': (prefix: string) => {
    const lowerPrefix = prefix.toLowerCase();

    return (value: string): boolean => { const result = value.toLowerCase().startsWith(lowerPrefix); return result; };
  }
};

/**
 * Boolean matchers
 */
const BooleanMatchers = {
  /**
   * Check if value is false
   */
  'isFalse': (value: boolean): boolean => {
    return !value;
  },

  /**
   * Check if value is true
   */
  'isTrue': (value: boolean): boolean => {
    const result = value;
    return result;
  }
};

/**
 * Array matchers
 */
const ArrayMatchers = {
  /**
   * Check if array contains value
   */
  'contains': <T>(searchValue: T) => {return (value: T[]): boolean => { const result = value.includes(searchValue); return result; };},

  /**
   * Check if array contains all of the values
   */
  'containsAll': <T>(...searchValues: T[]) => {return (value: T[]): boolean =>
  { const result = searchValues.every((sv) => { const result = value.includes(sv); return result; }); return result; };},

  /**
   * Check if array contains any of the values
   */
  'containsAny': <T>(...searchValues: T[]) => {return (value: T[]): boolean =>
  { const result = searchValues.some((sv) => { const result = value.includes(sv); return result; }); return result; };},

  /**
   * Check if array length is in range
   */
  'lengthInRange': (min: number, max: number) => {return <T>(value: T[]): boolean =>
  {return value.length >= min && value.length <= max;};},

  /**
   * Check if array is not empty
   */
  'notEmpty': <T>(value: T[]): boolean => {
    return value.length > EMPTY_LENGTH;
  }
};

/**
 * Object matchers
 */
const ObjectMatchers = {
  /**
   * Check if object has all properties
   */
  'hasAllProperties': (...propertyNames: string[]) =>
  {return (value: Record<string, unknown>): boolean => { const result = propertyNames.every((prop) => {return prop in value;}); return result; };},

  /**
   * Check if object has any of the properties
   */
  'hasAnyProperty': (...propertyNames: string[]) =>
  {return (value: Record<string, unknown>): boolean => { const result = propertyNames.some((prop) => {return prop in value;}); return result; };},

  /**
   * Check if object has property
   */
  'hasProperty': (propertyName: string) =>
  {return (value: Record<string, unknown>): boolean => {return propertyName in value;};}
};

/**
 * Logical combinators for composing matchers
 */
const LogicMatchers = {
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
    return (value: T): boolean => { const result = predicates.every((pred) => { const result = pred(value); return result; }); return result; };
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
      return !predicate(value);
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
    return (value: T): boolean => { const result = predicates.some((pred) => { const result = pred(value); return result; }); return result; };
  }
};

/**
 * Common HTTP status code matchers
 */
const HttpMatchers = {
  /**
   * Authentication errors
   */
  'isAuthError': NumberMatchers.oneOf(HTTP_UNAUTHORIZED, HTTP_FORBIDDEN),

  /**
   * 4xx Client error responses
   */
  'isClientError': NumberMatchers.inRange(HTTP_CLIENT_ERROR_START, HTTP_CLIENT_ERROR_END),

  /**
   * Gateway errors
   */
  'isGatewayError': NumberMatchers.oneOf(HTTP_BAD_GATEWAY, HTTP_SERVICE_UNAVAILABLE, HTTP_GATEWAY_TIMEOUT),

  /**
   * 1xx Informational responses
   */
  'isInformational': NumberMatchers.inRange(HTTP_INFORMATIONAL_START, HTTP_INFORMATIONAL_END),

  /**
   * Rate limiting
   */
  'isRateLimited': (status: number): boolean => {
    return status === HTTP_TOO_MANY_REQUESTS;
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
    HTTP_TOO_MANY_REQUESTS,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_BAD_GATEWAY,
    HTTP_SERVICE_UNAVAILABLE,
    HTTP_GATEWAY_TIMEOUT
  ),

  /**
   * 5xx Server error responses
   */
  'isServerError': NumberMatchers.inRange(HTTP_SERVER_ERROR_START, HTTP_SERVER_ERROR_END),

  /**
   * 2xx Success responses
   */
  'isSuccess': NumberMatchers.inRange(HTTP_SUCCESS_START, HTTP_SUCCESS_END)
};

/**
 * Common network error code matchers
 */
const NetworkMatchers = {
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
};

/**
 * Common database error matchers (PostgreSQL codes)
 */
const DatabaseMatchers = {
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
    return code === '23503';
  },

  /**
   * Unique violation (23505)
   */
  'isUniqueViolation': (code: string): boolean => {
    return code === '23505';
  }
};

/**
 * Instance and type checking matchers
 */
const InstanceMatchers = {
  /**
   * Check if value is an Error instance (any Error type)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', instance.isError)
   * ```
   */
  'isError': (value: unknown): value is Error => {
    return value instanceof Error;
  },

  /**
   * Check if value's type matches (using typeof)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'metadata', instance.isType('object'))
   * ```
   */
  'isType': (type: 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined') => {
    return (value: unknown): boolean => {
      return typeof value === type;
    };
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

    return (value as { 'constructor'?: { 'name'?: string } }).constructor?.name === name;
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

    return names.includes(constructorName);
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
  'of': <T>(constructor: new (...args: unknown[]) => T) => {
    return (value: unknown): value is T => {
      return value instanceof constructor;
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
  'ofAny': <T>(...constructors: (new (...args: unknown[]) => T)[]) =>
  {return (value: unknown): value is T => { const result = constructors.some((ctor) => {return value instanceof ctor;}); return result; };}
};

/**
 * Prototype checking matchers
 */

const protoHasAllMethods = (...methodNames: string[]) => {
  return (value: unknown): boolean => {
    if (value === null || value === undefined) { return false; }

    return methodNames.every((name) => {return typeof (value as Record<string, unknown>)[name] === 'function';});
  };
};

const protoHasAnyMethod = (...methodNames: string[]) => {
  return (value: unknown): boolean => {
    if (value === null || value === undefined) { return false; }

    return methodNames.some((name) => {return typeof (value as Record<string, unknown>)[name] === 'function';});
  };
};

const protoHasMethod = (methodName: string) => {
  return (value: unknown): boolean => {
    if (value === null || value === undefined) { return false; }

    return typeof (value as Record<string, unknown>)[methodName] === 'function';
  };
};

const protoHasProperty = (propertyName: string) => {
  return (value: unknown): boolean => {
    if (value === null || value === undefined) { return false; }

    return typeof value === 'object' && propertyName in value;
  };
};

const protoIsAsyncIterable = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  return typeof (value as Record<symbol, unknown>)[Symbol.asyncIterator] === 'function';
};

const protoIsCallable = (value: unknown): value is (...args: unknown[]) => unknown => {
  return typeof value === 'function';
};

const protoIsIterable = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  return typeof (value as Record<symbol, unknown>)[Symbol.iterator] === 'function';
};

const ProtoMatchers = {
  /**
   * Check if value's prototype has all specified methods
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.hasAllMethods('read', 'write', 'pipe'))
   * ```
   */
  'hasAllMethods': protoHasAllMethods,

  /**
   * Check if value's prototype has any of the specified methods
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.hasAnyMethod('read', 'pipe'))
   * ```
   */
  'hasAnyMethod': protoHasAnyMethod,

  /**
   * Check if value's prototype has a specific method
   *
   * @example
   * ```typescript
   * hasProperty(error, 'cause', prototype.hasMethod('toString'))
   * hasProperty(error, 'stream', prototype.hasMethod('pipe'))
   * ```
   */
  'hasMethod': protoHasMethod,

  /**
   * Check if value has a specific property (not just method)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'metadata', prototype.hasProperty('requestId'))
   * ```
   */
  'hasProperty': protoHasProperty,

  /**
   * Check if value is async iterable (has Symbol.asyncIterator)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'stream', prototype.isAsyncIterable)
   * ```
   */
  'isAsyncIterable': protoIsAsyncIterable,

  /**
   * Check if value is callable (is a function)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'retry', prototype.isCallable)
   * ```
   */
  'isCallable': protoIsCallable,

  /**
   * Check if value is iterable (has Symbol.iterator)
   *
   * @example
   * ```typescript
   * hasProperty(error, 'items', prototype.isIterable)
   * ```
   */
  'isIterable': protoIsIterable
};

/**
 * Aggregated matchers export matching filename
 */
const matchers = {
  'array': ArrayMatchers,
  'boolean': BooleanMatchers,
  'database': DatabaseMatchers,
  'http': HttpMatchers,
  'instance': InstanceMatchers,
  'isType': isType,
  'logic': LogicMatchers,
  'network': NetworkMatchers,
  'number': NumberMatchers,
  'object': ObjectMatchers,
  'proto': ProtoMatchers,
  'string': StringMatchers
};

export { matchers };
