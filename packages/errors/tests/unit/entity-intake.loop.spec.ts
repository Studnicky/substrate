import { SchemaIntakeError } from '@studnicky/entity/node';
import { PROBLEM_TITLE_ERROR, PROBLEM_TITLE_THROWN_NULLISH, PROBLEM_TYPE_ERROR, PROBLEM_TYPE_THROWN_NULLISH } from '@studnicky/types/browser';
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
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ValidationAggregateViewEntity } from '../../src/entities/ValidationAggregateViewEntity.js';
import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import { ValidationReportOptionsEntity } from '../../src/entities/ValidationReportOptionsEntity.js';
import { ValidationViolationDetailEntity } from '../../src/entities/ValidationViolationDetailEntity.js';
import { ValidationViolationEntity } from '../../src/entities/ValidationViolationEntity.js';

class EntityContractChecks {
  static checksCauseNode(): void {
    const value: CauseNodeEntity.Type = { 'detail': 'failure', 'title': PROBLEM_TITLE_ERROR, 'type': PROBLEM_TYPE_ERROR };
    assert.deepEqual(CauseNodeEntity.intake(value), value);
    assert.deepEqual(CauseNodeEntity.create(value), value);
  }

  static checksErrorClassification(): void {
    assert.deepEqual(ErrorClassificationEntity.intake({ 'retryable': true }), { 'retryable': true });
    assert.deepEqual(ErrorClassificationEntity.create({ 'retryable': true }), { 'retryable': true });
  }

  static checksErrorCodeDescriptor(): void {
    const value = { 'code': 'errors.example', 'description': 'Example', 'retryable': false };
    assert.deepEqual(ErrorCodeDescriptorEntity.intake(value), value);
    assert.deepEqual(ErrorCodeDescriptorEntity.create(value), value);
  }

  static checksErrorDiagnostic(): void {
    const value = { 'message': 'failure', 'name': 'Error' };
    assert.deepEqual(ErrorDiagnosticEntity.intake(value), value);
    assert.deepEqual(ErrorDiagnosticEntity.create(value), value);
  }

  static checksErrorWithAddress(): void {
    const value = { 'address': '127.0.0.1' };
    assert.deepEqual(ErrorWithAddressEntity.intake(value), value);
    assert.deepEqual(ErrorWithAddressEntity.create(value), value);
  }

  static checksErrorWithCode(): void {
    const value = { 'code': 'EFAIL' };
    assert.deepEqual(ErrorWithCodeEntity.intake(value), value);
    assert.deepEqual(ErrorWithCodeEntity.create(value), value);
  }

  static checksErrorWithErrno(): void {
    const value = { 'errno': 5 };
    assert.deepEqual(ErrorWithErrnoEntity.intake(value), value);
    assert.deepEqual(ErrorWithErrnoEntity.create(value), value);
  }

  static checksErrorWithHostname(): void {
    const value = { 'hostname': 'localhost' };
    assert.deepEqual(ErrorWithHostnameEntity.intake(value), value);
    assert.deepEqual(ErrorWithHostnameEntity.create(value), value);
  }

  static checksErrorWithPort(): void {
    const value = { 'port': 8080 };
    assert.deepEqual(ErrorWithPortEntity.intake(value), value);
    assert.deepEqual(ErrorWithPortEntity.create(value), value);
  }

  static checksErrorWithRetryAfter(): void {
    const value = { 'retryAfter': 30 };
    assert.deepEqual(ErrorWithRetryAfterEntity.intake(value), value);
    assert.deepEqual(ErrorWithRetryAfterEntity.create(value), value);
  }

  static checksErrorWithStatusCode(): void {
    const value = { 'statusCode': 503 };
    assert.deepEqual(ErrorWithStatusCodeEntity.intake(value), value);
    assert.deepEqual(ErrorWithStatusCodeEntity.create(value), value);
  }

  static checksErrorWithStatus(): void {
    const value = { 'status': 503 };
    assert.deepEqual(ErrorWithStatusEntity.intake(value), value);
    assert.deepEqual(ErrorWithStatusEntity.create(value), value);
  }

  static checksErrorWithSyscall(): void {
    const value = { 'syscall': 'connect' };
    assert.deepEqual(ErrorWithSyscallEntity.intake(value), value);
    assert.deepEqual(ErrorWithSyscallEntity.create(value), value);
  }

  static checksHookInvokerOptions(): void {
    const value = { 'detectReentrancy': true, 'timeoutMs': 100 };
    assert.deepEqual(HookInvokerOptionsEntity.intake(value), value);
    assert.deepEqual(HookInvokerOptionsEntity.create(value), value);
  }

  static checksValidationAggregateView(): void {
    const value = { 'count': 1, 'keywords': ['type'], 'paths': ['/field'] };
    assert.deepEqual(ValidationAggregateViewEntity.intake(value), value);
    assert.deepEqual(ValidationAggregateViewEntity.create(value), value);
  }

  static checksValidationErrorArguments(): void {
    const value = { 'message': 'invalid', 'path': '/field', 'violations': [{ 'message': 'wrong type', 'path': '/field' }] };
    assert.deepEqual(ValidationErrorArgumentsEntity.intake(value), value);
    assert.deepEqual(ValidationErrorArgumentsEntity.create(value), value);
  }

  static checksProblemDetails(): void {
    const value = { 'detail': 'invalid', 'errors': [{ 'keyword': 'type', 'message': 'wrong type', 'path': '/field' }], 'status': 422, 'title': 'Invalid', 'type': 'https://example.test/problem' };
    const intaken = ProblemDetailsEntity.intake(value);
    assert.deepEqual(intaken, value);
    assert.deepEqual(ProblemDetailsEntity.create(intaken), value);
  }

  static checksValidationReportOptions(): void {
    const value = { 'status': 422, 'title': 'Invalid', 'type': 'https://example.test/problem' };
    const intaken = ValidationReportOptionsEntity.intake(value);
    assert.deepEqual(intaken, value);
    assert.deepEqual(ValidationReportOptionsEntity.create(intaken), value);
  }

  static checksValidationViolationDetail(): void {
    const value = { 'details': { 'limit': 3 }, 'message': 'too long', 'path': '/field' };
    assert.deepEqual(ValidationViolationDetailEntity.intake(value), value);
    assert.deepEqual(ValidationViolationDetailEntity.create(value), value);
  }

  static checksValidationViolation(): void {
    const value = { 'keyword': 'type', 'message': 'wrong type', 'path': '/field' };
    assert.deepEqual(ValidationViolationEntity.intake(value), value);
    assert.deepEqual(ValidationViolationEntity.create(value), value);
  }
}

class EntityIntakeBoundariesSuite {
  static declaresRejectsUndeclaredPropertiesWithoutMutating(): void {
    void it('rejects undeclared properties without mutating the caller value', () => {
      const input = {
        'ignored': { 'nested': true },
        'retryable': true
      };

      assert.throws(() => {
        const result = ErrorClassificationEntity.intake(input);
        return result;
      }, SchemaIntakeError);
      assert.deepEqual(input, {
        'ignored': { 'nested': true },
        'retryable': true
      });
    });
  }

  static declaresRejectsInvalidAndCyclicExternal(): void {
    void it('rejects invalid and cyclic external input with a typed error', () => {
      const cyclic: { 'retryable': boolean; 'self'?: unknown } = { 'retryable': true };
      cyclic.self = cyclic;

      assert.throws(() => {
        const result = ErrorClassificationEntity.intake({ 'retryable': 'not-a-boolean' });
        return result;
      }, SchemaIntakeError);
      assert.throws(() => {
        const result = ErrorClassificationEntity.intake({ 'retryable': 'true' });
        return result;
      }, SchemaIntakeError, 'a numeric-looking or boolean-looking string is rejected, not coerced');
      const invalidRoots: readonly unknown[] = ['not an object', null, ['array']];
      for (let index = 0; index < invalidRoots.length; index += 1) {
        assert.throws(() => {
          const result = ErrorClassificationEntity.intake(invalidRoots[index]);
          return result;
        }, SchemaIntakeError);
      }
      assert.throws(() => {
        const result = ErrorClassificationEntity.intake(cyclic);
        return result;
      }, SchemaIntakeError);
    });
  }

  static declaresKeepsCreateStrictAndNon(): void {
    void it('keeps create strict and non-transforming', () => {
      const partial = {};
      Reflect.set(partial, 'unexpected', true);

      assert.throws(() => {
        const result = ErrorWithStatusEntity.create(partial);
        return result;
      }, SchemaIntakeError);
      assert.throws(() => {
        const result = ErrorWithStatusEntity.create({ 'status': Number.NaN });
        return result;
      }, SchemaIntakeError);
    });
  }

  static declaresRejectsAnInvalidCauseNode(): void {
    void it('rejects an invalid cause node with SchemaIntakeError', () => {
      assert.throws(
        () => {
          const result = CauseNodeEntity.intake({ 'detail': 1, 'title': 'Error', 'type': 'https://example.test/problem' });
          return result;
        },
        (error) => {
          assert.ok(error instanceof SchemaIntakeError);
          assert.strictEqual(error.code, 'entity.schemaIntakeFailed');
          return true;
        }
      );
    });
  }

  static declaresRejectsUnknownCauseNodeMembers(): void {
    void it('rejects unknown cause-node members and isolates nested input', () => {
      const input = {
        'context': { 'nested': { 'retained': true } },
        'detail': 'failure',
        'title': 'Error',
        'type': 'https://example.test/problem'
      };
      const result = CauseNodeEntity.intake(input);
      input.context.nested.retained = false;

      assert.deepEqual(result, {
        'context': { 'nested': { 'retained': true } },
        'detail': 'failure',
        'title': 'Error',
        'type': 'https://example.test/problem'
      });
      assert.throws(() => {
        const returned = CauseNodeEntity.intake({ ...input, 'unexpected': true });
        return returned;
      }, SchemaIntakeError);
    });
  }

  static declaresPreservesAndIsolatesOpenProblem(): void {
    void it('preserves and isolates open Problem Details extensions', () => {
      const input = {
        'context': { 'nested': { 'retained': true } },
        'vendorExtension': { 'nested': { 'retained': true } }
      };
      const result = ProblemDetailsEntity.intake(input);
      input.context.nested.retained = false;
      input.vendorExtension.nested.retained = false;

      assert.deepEqual(result, {
        'context': { 'nested': { 'retained': true } },
        'vendorExtension': { 'nested': { 'retained': true } }
      });

      const cyclic: { 'self'?: unknown } = {};
      cyclic.self = cyclic;
      assert.throws(() => {
        const returned = ProblemDetailsEntity.intake(cyclic);
        return returned;
      }, SchemaIntakeError);
    });
  }

  static declaresDefaultsValidatesAndIsolatesCauseNode(): void {
    void it('defaults, validates, and isolates CauseNode create input', () => {
      const input = {
        'context': { 'nested': { 'retained': true } },
        'detail': 'failure',
        'title': 'Error',
        'type': 'https://example.test/problem'
      };
      const result = CauseNodeEntity.create(input);
      input.context.nested.retained = false;

      assert.deepEqual(result, {
        'context': { 'nested': { 'retained': true } },
        'detail': 'failure',
        'title': 'Error',
        'type': 'https://example.test/problem'
      });
      assert.deepEqual(CauseNodeEntity.create(), {
        'detail': '',
        'title': PROBLEM_TITLE_THROWN_NULLISH,
        'type': PROBLEM_TYPE_THROWN_NULLISH
      });

      const malformed = {};
      Reflect.set(malformed, 'detail', 1);
      assert.throws(() => {
        const returned = CauseNodeEntity.create(malformed);
        return returned;
      }, SchemaIntakeError);
      Reflect.set(malformed, 'detail', 'failure');
      Reflect.set(malformed, 'unexpected', true);
      assert.throws(() => {
        const returned = CauseNodeEntity.create(malformed);
        return returned;
      }, SchemaIntakeError);

      const cyclic = {};
      Reflect.set(cyclic, 'context', cyclic);
      const cyclicResult = CauseNodeEntity.create(cyclic);
      assert.notStrictEqual(cyclicResult, cyclic);
      assert.strictEqual(cyclicResult.context, cyclicResult);
    });
  }

  static declaresValidatesPreservesExtensionsAndIsolates(): void {
    void it('validates, preserves extensions, and isolates Problem Details create input', () => {
      const input = {
        'context': { 'nested': { 'retained': true } },
        'vendorExtension': { 'nested': { 'retained': true } }
      };
      const result = ProblemDetailsEntity.create(input);
      input.context.nested.retained = false;
      input.vendorExtension.nested.retained = false;

      assert.deepEqual(result, {
        'context': { 'nested': { 'retained': true } },
        'vendorExtension': { 'nested': { 'retained': true } }
      });

      const malformed = {};
      Reflect.set(malformed, 'status', 99);
      assert.throws(() => {
        const returned = ProblemDetailsEntity.create(malformed);
        return returned;
      }, SchemaIntakeError);

      const cyclic = {};
      Reflect.set(cyclic, 'vendorExtension', cyclic);
      const cyclicResult = ProblemDetailsEntity.create(cyclic);
      assert.notStrictEqual(cyclicResult, cyclic);
      assert.strictEqual(cyclicResult.vendorExtension, cyclicResult);
    });
  }

  static declaresProvidesIntakeAndCreateFor(): void {
    void it('provides intake and create for every object entity', () => {
      EntityContractChecks.checksCauseNode();
      EntityContractChecks.checksErrorClassification();
      EntityContractChecks.checksErrorCodeDescriptor();
      EntityContractChecks.checksErrorDiagnostic();
      EntityContractChecks.checksErrorWithAddress();
      EntityContractChecks.checksErrorWithCode();
      EntityContractChecks.checksErrorWithErrno();
      EntityContractChecks.checksErrorWithHostname();
      EntityContractChecks.checksErrorWithPort();
      EntityContractChecks.checksErrorWithRetryAfter();
      EntityContractChecks.checksErrorWithStatusCode();
      EntityContractChecks.checksErrorWithStatus();
      EntityContractChecks.checksErrorWithSyscall();
      EntityContractChecks.checksHookInvokerOptions();
      EntityContractChecks.checksValidationAggregateView();
      EntityContractChecks.checksValidationErrorArguments();
      EntityContractChecks.checksProblemDetails();
      EntityContractChecks.checksValidationReportOptions();
      EntityContractChecks.checksValidationViolationDetail();
      EntityContractChecks.checksValidationViolation();
    });
  }
}

void describe('errors entity intake boundaries', () => {
  EntityIntakeBoundariesSuite.declaresRejectsUndeclaredPropertiesWithoutMutating();
  EntityIntakeBoundariesSuite.declaresRejectsInvalidAndCyclicExternal();
  EntityIntakeBoundariesSuite.declaresKeepsCreateStrictAndNon();
  EntityIntakeBoundariesSuite.declaresRejectsAnInvalidCauseNode();
  EntityIntakeBoundariesSuite.declaresRejectsUnknownCauseNodeMembers();
  EntityIntakeBoundariesSuite.declaresPreservesAndIsolatesOpenProblem();
  EntityIntakeBoundariesSuite.declaresDefaultsValidatesAndIsolatesCauseNode();
  EntityIntakeBoundariesSuite.declaresValidatesPreservesExtensionsAndIsolates();
  EntityIntakeBoundariesSuite.declaresProvidesIntakeAndCreateFor();
});
