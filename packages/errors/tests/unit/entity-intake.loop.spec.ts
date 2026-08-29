import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { CauseNodeEntity } from '../../src/entities/CauseNodeEntity.js';
import { ErrorClassificationEntity } from '../../src/entities/ErrorClassificationEntity.js';
import { ErrorCodeDescriptorEntity } from '../../src/entities/ErrorCodeDescriptorEntity.js';
import { ErrorDiagnosticEntity } from '../../src/entities/ErrorDiagnosticEntity.js';
import { ErrorWithAddressEntity } from '../../src/entities/ErrorWithAddressEntity.js';
import { ErrorWithCodeEntity } from '../../src/entities/ErrorWithCodeEntity.js';
import { ErrorWithErrnoEntity } from '../../src/entities/ErrorWithErrnoEntity.js';
import { ErrorWithHostnameEntity } from '../../src/entities/ErrorWithHostnameEntity.js';
import { ErrorWithPortEntity } from '../../src/entities/ErrorWithPortEntity.js';
import { ErrorWithRetryAfterEntity } from '../../src/entities/ErrorWithRetryAfterEntity.js';
import { ErrorWithStatusCodeEntity } from '../../src/entities/ErrorWithStatusCodeEntity.js';
import { ErrorWithStatusEntity } from '../../src/entities/ErrorWithStatusEntity.js';
import { ErrorWithSyscallEntity } from '../../src/entities/ErrorWithSyscallEntity.js';
import { HookInvokerOptionsEntity } from '../../src/entities/HookInvokerOptionsEntity.js';
import { ValidationAggregateViewEntity } from '../../src/entities/ValidationAggregateViewEntity.js';
import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ValidationReportOptionsEntity } from '../../src/entities/ValidationReportOptionsEntity.js';
import { ValidationViolationDetailEntity } from '../../src/entities/ValidationViolationDetailEntity.js';
import { ValidationViolationEntity } from '../../src/entities/ValidationViolationEntity.js';
import {
  PROBLEM_TITLE_ERROR, PROBLEM_TYPE_ERROR
} from '../../src/constants/ProblemConstants.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

void describe('errors entity intake boundaries', () => {
  void it('strips a private clone without mutating the caller value, without coercing types', () => {
    const input = {
      'ignored': { 'nested': true },
      'retryable': true
    };

    const result = ErrorClassificationEntity.intake(input);

    assert.deepEqual(result, { 'retryable': true });
    assert.deepEqual(input, {
      'ignored': { 'nested': true },
      'retryable': true
    });
  });

  void it('rejects invalid and cyclic external input with a typed error', () => {
    const cyclic: { retryable: boolean; self?: unknown } = { 'retryable': true };
    cyclic.self = cyclic;

    assert.throws(() => ErrorClassificationEntity.intake({ 'retryable': 'not-a-boolean' }), ValidationError);
    assert.throws(() => ErrorClassificationEntity.intake({ 'retryable': 'true' }), ValidationError, 'a numeric-looking or boolean-looking string is rejected, not coerced');
    assert.throws(() => ErrorClassificationEntity.intake(cyclic), ValidationError);
  });

  void it('keeps create strict and non-transforming', () => {
    const partial: Partial<ErrorWithStatusEntity.Type> = {};
    Reflect.set(partial, 'unexpected', true);

    assert.throws(() => ErrorWithStatusEntity.create(partial), ValidationError);
    assert.throws(() => ErrorWithStatusEntity.create({ 'status': Number.NaN }), ValidationError);
  });

  void it('rejects an invalid cause node with RuntimeError', () => {
    assert.throws(
      () => CauseNodeEntity.intake({ 'detail': 'failure', 'title': 'Error' }),
      (error) => {
        assert.ok(error instanceof RuntimeError);
        assert.strictEqual(error.code, 'errors.runtime');
        return true;
      }
    );
  });

  void it('provides intake and create for every object entity', () => {
    const contracts: readonly (() => void)[] = [
      () => {
        const value: CauseNodeEntity.Type = { 'detail': 'failure', 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR };
        assert.deepEqual(CauseNodeEntity.intake(value), value);
        assert.deepEqual(CauseNodeEntity.create(value), value);
      },
      () => {
        assert.deepEqual(ErrorClassificationEntity.intake({ 'retryable': true }), { 'retryable': true });
        assert.deepEqual(ErrorClassificationEntity.create({ 'retryable': true }), { 'retryable': true });
      },
      () => {
        const value = { 'code': 'errors.example', 'description': 'Example', 'retryable': false };
        assert.deepEqual(ErrorCodeDescriptorEntity.intake(value), value);
        assert.deepEqual(ErrorCodeDescriptorEntity.create(value), value);
      },
      () => {
        const value = { 'message': 'failure', 'name': 'Error' };
        assert.deepEqual(ErrorDiagnosticEntity.intake(value), value);
        assert.deepEqual(ErrorDiagnosticEntity.create(value), value);
      },
      () => {
        const value = { 'address': '127.0.0.1' };
        assert.deepEqual(ErrorWithAddressEntity.intake(value), value);
        assert.deepEqual(ErrorWithAddressEntity.create(value), value);
      },
      () => {
        const value = { 'code': 'EFAIL' };
        assert.deepEqual(ErrorWithCodeEntity.intake(value), value);
        assert.deepEqual(ErrorWithCodeEntity.create(value), value);
      },
      () => {
        const value = { 'errno': 5 };
        assert.deepEqual(ErrorWithErrnoEntity.intake(value), value);
        assert.deepEqual(ErrorWithErrnoEntity.create(value), value);
      },
      () => {
        const value = { 'hostname': 'localhost' };
        assert.deepEqual(ErrorWithHostnameEntity.intake(value), value);
        assert.deepEqual(ErrorWithHostnameEntity.create(value), value);
      },
      () => {
        const value = { 'port': 8080 };
        assert.deepEqual(ErrorWithPortEntity.intake(value), value);
        assert.deepEqual(ErrorWithPortEntity.create(value), value);
      },
      () => {
        const value = { 'retryAfter': 30 };
        assert.deepEqual(ErrorWithRetryAfterEntity.intake(value), value);
        assert.deepEqual(ErrorWithRetryAfterEntity.create(value), value);
      },
      () => {
        const value = { 'statusCode': 503 };
        assert.deepEqual(ErrorWithStatusCodeEntity.intake(value), value);
        assert.deepEqual(ErrorWithStatusCodeEntity.create(value), value);
      },
      () => {
        const value = { 'status': 503 };
        assert.deepEqual(ErrorWithStatusEntity.intake(value), value);
        assert.deepEqual(ErrorWithStatusEntity.create(value), value);
      },
      () => {
        const value = { 'syscall': 'connect' };
        assert.deepEqual(ErrorWithSyscallEntity.intake(value), value);
        assert.deepEqual(ErrorWithSyscallEntity.create(value), value);
      },
      () => {
        const value = { 'detectReentrancy': true, 'timeoutMs': 100 };
        assert.deepEqual(HookInvokerOptionsEntity.intake(value), value);
        assert.deepEqual(HookInvokerOptionsEntity.create(value), value);
      },
      () => {
        const value = { 'count': 1, 'keywords': ['type'], 'paths': ['/field'] };
        assert.deepEqual(ValidationAggregateViewEntity.intake(value), value);
        assert.deepEqual(ValidationAggregateViewEntity.create(value), value);
      },
      () => {
        const value = { 'message': 'invalid', 'path': '/field', 'violations': [{ 'message': 'wrong type', 'path': '/field' }] };
        assert.deepEqual(ValidationErrorArgumentsEntity.intake(value), value);
        assert.deepEqual(ValidationErrorArgumentsEntity.create(value), value);
      },
      () => {
        const value = { 'detail': 'invalid', 'errors': [{ 'keyword': 'type', 'message': 'wrong type', 'path': '/field' }], 'status': 422, 'title': 'Invalid', 'type': 'https://example.test/problem' };
        assert.deepEqual(ProblemDetailsEntity.intake(value), value);
        assert.deepEqual(ProblemDetailsEntity.create(value), value);
      },
      () => {
        const value = { 'status': 422, 'title': 'Invalid', 'type': 'https://example.test/problem' };
        assert.deepEqual(ValidationReportOptionsEntity.intake(value), value);
        assert.deepEqual(ValidationReportOptionsEntity.create(value), value);
      },
      () => {
        const value = { 'details': { 'limit': 3 }, 'message': 'too long', 'path': '/field' };
        assert.deepEqual(ValidationViolationDetailEntity.intake(value), value);
        assert.deepEqual(ValidationViolationDetailEntity.create(value), value);
      },
      () => {
        const value = { 'keyword': 'type', 'message': 'wrong type', 'path': '/field' };
        assert.deepEqual(ValidationViolationEntity.intake(value), value);
        assert.deepEqual(ValidationViolationEntity.create(value), value);
      }
    ];

    for (const contract of contracts) {
      contract();
    }
  });
});
