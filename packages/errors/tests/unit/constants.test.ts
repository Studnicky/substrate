/**
 * Constants Unit Tests
 *
 * Tests for error constants including:
 * - ErrorCode values
 * - HttpStatus values
 * - ErrorDefaults configurations
 */

import {
  deepStrictEqual,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import {
  ErrorCode,
  ErrorDefaults,
  HttpStatus
} from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';

void describe('ErrorCode', () => {
  void it('has all expected error codes', () => {
    strictEqual(ErrorCode.AUTHENTICATION_ERROR, 'AUTHENTICATION_ERROR');
    strictEqual(ErrorCode.AUTHORIZATION_ERROR, 'AUTHORIZATION_ERROR');
    strictEqual(ErrorCode.CONNECTION_ERROR, 'CONNECTION_ERROR');
    strictEqual(ErrorCode.DATABASE_ERROR, 'DATABASE_ERROR');
    strictEqual(ErrorCode.NOT_FOUND, 'NOT_FOUND');
    strictEqual(ErrorCode.TIMEOUT_ERROR, 'TIMEOUT_ERROR');
    strictEqual(ErrorCode.VALIDATION_ERROR, 'VALIDATION_ERROR');
    strictEqual(ErrorCode.RATE_LIMIT_ERROR, 'RATE_LIMIT_ERROR');
    strictEqual(ErrorCode.EXTERNAL_SERVICE_ERROR, 'EXTERNAL_SERVICE_ERROR');
    strictEqual(ErrorCode.CONFIGURATION_ERROR, 'CONFIGURATION_ERROR');
    strictEqual(ErrorCode.INTERNAL_ERROR, 'INTERNAL_ERROR');
  });
});

void describe('HttpStatus', () => {
  void it('has all client error codes', () => {
    strictEqual(HttpStatus.BAD_REQUEST, 400);
    strictEqual(HttpStatus.UNAUTHORIZED, 401);
    strictEqual(HttpStatus.FORBIDDEN, 403);
    strictEqual(HttpStatus.NOT_FOUND, 404);
    strictEqual(HttpStatus.METHOD_NOT_ALLOWED, 405);
    strictEqual(HttpStatus.CONFLICT, 409);
    strictEqual(HttpStatus.UNPROCESSABLE_ENTITY, 422);
    strictEqual(HttpStatus.TOO_MANY_REQUESTS, 429);
  });

  void it('has all server error codes', () => {
    strictEqual(HttpStatus.INTERNAL_SERVER_ERROR, 500);
    strictEqual(HttpStatus.NOT_IMPLEMENTED, 501);
    strictEqual(HttpStatus.BAD_GATEWAY, 502);
    strictEqual(HttpStatus.SERVICE_UNAVAILABLE, 503);
    strictEqual(HttpStatus.GATEWAY_TIMEOUT, 504);
  });
});

void describe('ErrorDefaults', () => {
  void describe('AUTHENTICATION', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.AUTHENTICATION, {
        code: ErrorCode.AUTHENTICATION_ERROR,
        retryable: false,
        statusCode: HttpStatus.UNAUTHORIZED
      });
    });

    void it('is used via ModuleError.create()', () => {
      const error = ModuleError.create('Authentication failed', {
        context: { userId: '123' },
        scenario: 'AUTHENTICATION'
      });

      strictEqual(error.code, ErrorCode.AUTHENTICATION_ERROR);
      strictEqual(error.statusCode, HttpStatus.UNAUTHORIZED);
      strictEqual(error.retryable, false);
      deepStrictEqual(error.context, { userId: '123' });
    });
  });

  void describe('AUTHORIZATION', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.AUTHORIZATION, {
        code: ErrorCode.AUTHORIZATION_ERROR,
        retryable: false,
        statusCode: HttpStatus.FORBIDDEN
      });
    });
  });

  void describe('CONNECTION', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.CONNECTION, {
        code: ErrorCode.CONNECTION_ERROR,
        retryable: true,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE
      });
    });

    void it('marks errors as retryable', () => {
      const error = ModuleError.create('Connection lost', { scenario: 'CONNECTION' });

      strictEqual(error.retryable, true);
    });
  });

  void describe('DATABASE', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.DATABASE, {
        code: ErrorCode.DATABASE_ERROR,
        retryable: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    });
  });

  void describe('NOT_FOUND', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.NOT_FOUND, {
        code: ErrorCode.NOT_FOUND,
        retryable: false,
        statusCode: HttpStatus.NOT_FOUND
      });
    });
  });

  void describe('TIMEOUT', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.TIMEOUT, {
        code: ErrorCode.TIMEOUT_ERROR,
        retryable: true,
        statusCode: HttpStatus.GATEWAY_TIMEOUT
      });
    });

    void it('marks errors as retryable', () => {
      const error = ModuleError.create('Operation timed out', { scenario: 'TIMEOUT' });

      strictEqual(error.retryable, true);
    });
  });

  void describe('VALIDATION', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.VALIDATION, {
        code: ErrorCode.VALIDATION_ERROR,
        retryable: false,
        statusCode: HttpStatus.BAD_REQUEST
      });
    });
  });

  void describe('RATE_LIMIT', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.RATE_LIMIT, {
        code: ErrorCode.RATE_LIMIT_ERROR,
        retryable: true,
        statusCode: HttpStatus.TOO_MANY_REQUESTS
      });
    });

    void it('marks errors as retryable', () => {
      const error = ModuleError.create('Rate limit exceeded', { scenario: 'RATE_LIMIT' });

      strictEqual(error.retryable, true);
    });
  });

  void describe('EXTERNAL_SERVICE', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.EXTERNAL_SERVICE, {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        retryable: true,
        statusCode: HttpStatus.BAD_GATEWAY
      });
    });

    void it('marks errors as retryable', () => {
      const error = ModuleError.create('Service unavailable', { scenario: 'EXTERNAL_SERVICE' });

      strictEqual(error.retryable, true);
    });
  });

  void describe('CONFIGURATION', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.CONFIGURATION, {
        code: ErrorCode.CONFIGURATION_ERROR,
        retryable: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    });
  });

  void describe('INTERNAL', () => {
    void it('has correct defaults', () => {
      deepStrictEqual(ErrorDefaults.INTERNAL, {
        code: ErrorCode.INTERNAL_ERROR,
        retryable: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    });
  });
});

void describe('ErrorDefaults Integration', () => {
  void it('works with context override', () => {
    const error = ModuleError.create('Failed to connect', {
      context: {
        attempt: 3,
        host: 'api.example.com'
      },
      scenario: 'CONNECTION'
    });

    strictEqual(error.code, ErrorCode.CONNECTION_ERROR);
    strictEqual(error.retryable, true);
    deepStrictEqual(error.context, {
      attempt: 3,
      host: 'api.example.com'
    });
  });

  void it('works with cause override', () => {
    const cause = new Error('Socket timeout');
    const error = ModuleError.create('Connection failed', {
      cause,
      scenario: 'CONNECTION'
    });

    strictEqual(error.cause, cause);
    strictEqual(error.code, ErrorCode.CONNECTION_ERROR);
  });

  void it('allows overriding retryable', () => {
    const error = ModuleError.create('Permanent connection failure', {
      retryable: false,
      scenario: 'CONNECTION'
    });

    strictEqual(error.retryable, false);
    strictEqual(error.code, ErrorCode.CONNECTION_ERROR);
  });

  void it('allows overriding statusCode', () => {
    const error = ModuleError.create('Database locked', {
      scenario: 'DATABASE',
      statusCode: HttpStatus.CONFLICT
    });

    strictEqual(error.statusCode, HttpStatus.CONFLICT);
    strictEqual(error.code, ErrorCode.DATABASE_ERROR);
  });
});
