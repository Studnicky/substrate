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
  const defaultsScenarios: Array<{
    description: string;
    scenario: keyof typeof ErrorDefaults;
    expected: { code: string; retryable: boolean; statusCode: number };
  }> = [
    {
      description: 'AUTHENTICATION has correct defaults',
      expected: { code: ErrorCode.AUTHENTICATION_ERROR, retryable: false, statusCode: HttpStatus.UNAUTHORIZED },
      scenario: 'AUTHENTICATION'
    },
    {
      description: 'AUTHORIZATION has correct defaults',
      expected: { code: ErrorCode.AUTHORIZATION_ERROR, retryable: false, statusCode: HttpStatus.FORBIDDEN },
      scenario: 'AUTHORIZATION'
    },
    {
      description: 'CONNECTION has correct defaults',
      expected: { code: ErrorCode.CONNECTION_ERROR, retryable: true, statusCode: HttpStatus.SERVICE_UNAVAILABLE },
      scenario: 'CONNECTION'
    },
    {
      description: 'DATABASE has correct defaults',
      expected: { code: ErrorCode.DATABASE_ERROR, retryable: false, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
      scenario: 'DATABASE'
    },
    {
      description: 'NOT_FOUND has correct defaults',
      expected: { code: ErrorCode.NOT_FOUND, retryable: false, statusCode: HttpStatus.NOT_FOUND },
      scenario: 'NOT_FOUND'
    },
    {
      description: 'TIMEOUT has correct defaults',
      expected: { code: ErrorCode.TIMEOUT_ERROR, retryable: true, statusCode: HttpStatus.GATEWAY_TIMEOUT },
      scenario: 'TIMEOUT'
    },
    {
      description: 'VALIDATION has correct defaults',
      expected: { code: ErrorCode.VALIDATION_ERROR, retryable: false, statusCode: HttpStatus.BAD_REQUEST },
      scenario: 'VALIDATION'
    },
    {
      description: 'RATE_LIMIT has correct defaults',
      expected: { code: ErrorCode.RATE_LIMIT_ERROR, retryable: true, statusCode: HttpStatus.TOO_MANY_REQUESTS },
      scenario: 'RATE_LIMIT'
    },
    {
      description: 'EXTERNAL_SERVICE has correct defaults',
      expected: { code: ErrorCode.EXTERNAL_SERVICE_ERROR, retryable: true, statusCode: HttpStatus.BAD_GATEWAY },
      scenario: 'EXTERNAL_SERVICE'
    },
    {
      description: 'CONFIGURATION has correct defaults',
      expected: { code: ErrorCode.CONFIGURATION_ERROR, retryable: false, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
      scenario: 'CONFIGURATION'
    },
    {
      description: 'INTERNAL has correct defaults',
      expected: { code: ErrorCode.INTERNAL_ERROR, retryable: false, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
      scenario: 'INTERNAL'
    }
  ];

  for (const { description, scenario, expected } of defaultsScenarios) {
    void it(description, () => {
      deepStrictEqual(ErrorDefaults[scenario], expected);
    });
  }

  void it('AUTHENTICATION is used via ModuleError.create()', () => {
    const error = ModuleError.create('Authentication failed', {
      context: { userId: '123' },
      scenario: 'AUTHENTICATION'
    });

    strictEqual(error.code, ErrorCode.AUTHENTICATION_ERROR);
    strictEqual(error.statusCode, HttpStatus.UNAUTHORIZED);
    strictEqual(error.retryable, false);
    deepStrictEqual(error.context, { userId: '123' });
  });

  const retryableScenariosArgs: Array<{ description: string; message: string; scenario: 'CONNECTION' | 'TIMEOUT' | 'RATE_LIMIT' | 'EXTERNAL_SERVICE' }> = [
    { description: 'CONNECTION marks errors as retryable', message: 'Connection lost', scenario: 'CONNECTION' },
    { description: 'TIMEOUT marks errors as retryable', message: 'Operation timed out', scenario: 'TIMEOUT' },
    { description: 'RATE_LIMIT marks errors as retryable', message: 'Rate limit exceeded', scenario: 'RATE_LIMIT' },
    { description: 'EXTERNAL_SERVICE marks errors as retryable', message: 'Service unavailable', scenario: 'EXTERNAL_SERVICE' }
  ];

  for (const { description, message, scenario } of retryableScenariosArgs) {
    void it(description, () => {
      const error = ModuleError.create(message, { scenario });
      strictEqual(error.retryable, true);
    });
  }
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
