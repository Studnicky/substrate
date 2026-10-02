import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

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
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ValidationAggregateViewEntity } from '../../src/entities/ValidationAggregateViewEntity.js';
import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import { ValidationReportOptionsEntity } from '../../src/entities/ValidationReportOptionsEntity.js';
import { ValidationViolationDetailEntity } from '../../src/entities/ValidationViolationDetailEntity.js';
import { EntityContractsScenarioCaseEntity } from './entities/EntityContractsScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { 'type': 'json' };

class EntityContractsRunners {
  static 'aggregate-view-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'aggregate-view-invalid'>): void {
    assert.strictEqual(ValidationAggregateViewEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'aggregate-view-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'aggregate-view-valid'>): void {
    assert.strictEqual(ValidationAggregateViewEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-classification-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-classification-invalid'>): void {
    assert.strictEqual(ErrorClassificationEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-classification-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-classification-valid'>): void {
    assert.strictEqual(ErrorClassificationEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-code-descriptor-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-code-descriptor-invalid'>): void {
    assert.strictEqual(ErrorCodeDescriptorEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-code-descriptor-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-code-descriptor-valid'>): void {
    assert.strictEqual(ErrorCodeDescriptorEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-diagnostic-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-diagnostic-invalid'>): void {
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.missingName), Boolean(scenarioCase.expected.missingName));
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.missingMessage), Boolean(scenarioCase.expected.missingMessage));
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.badStack), Boolean(scenarioCase.expected.badStack));
  }

  static 'error-diagnostic-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-diagnostic-valid'>): void {
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-diagnostic-valid-no-stack'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-diagnostic-valid-no-stack'>): void {
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-address-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-address-invalid'>): void {
    assert.strictEqual(ErrorWithAddressEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-address-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-address-valid'>): void {
    assert.strictEqual(ErrorWithAddressEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-code-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-code-invalid'>): void {
    assert.strictEqual(ErrorWithCodeEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-code-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-code-valid'>): void {
    assert.strictEqual(ErrorWithCodeEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-errno-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-errno-invalid'>): void {
    assert.strictEqual(ErrorWithErrnoEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-errno-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-errno-valid'>): void {
    assert.strictEqual(ErrorWithErrnoEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-hostname-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-hostname-invalid'>): void {
    assert.strictEqual(ErrorWithHostnameEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-hostname-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-hostname-valid'>): void {
    assert.strictEqual(ErrorWithHostnameEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-port-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-port-invalid'>): void {
    assert.strictEqual(ErrorWithPortEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-port-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-port-valid'>): void {
    assert.strictEqual(ErrorWithPortEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-retry-after-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-retry-after-invalid'>): void {
    assert.strictEqual(ErrorWithRetryAfterEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-retry-after-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-retry-after-valid'>): void {
    assert.strictEqual(ErrorWithRetryAfterEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-status-code-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-status-code-invalid'>): void {
    assert.strictEqual(ErrorWithStatusCodeEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-status-code-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-status-code-valid'>): void {
    assert.strictEqual(ErrorWithStatusCodeEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-status-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-status-invalid'>): void {
    assert.strictEqual(ErrorWithStatusEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-status-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-status-valid'>): void {
    assert.strictEqual(ErrorWithStatusEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-syscall-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-syscall-invalid'>): void {
    assert.strictEqual(ErrorWithSyscallEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'error-with-syscall-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-with-syscall-valid'>): void {
    assert.strictEqual(ErrorWithSyscallEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'problem-details-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'problem-details-invalid'>): void {
    assert.strictEqual(ProblemDetailsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'problem-details-invalid-item'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'problem-details-invalid-item'>): void {
    assert.strictEqual(ProblemDetailsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'problem-details-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'problem-details-valid'>): void {
    assert.strictEqual(ProblemDetailsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'problem-details-valid-empty-errors'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'problem-details-valid-empty-errors'>): void {
    assert.strictEqual(ProblemDetailsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'report-options-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'report-options-invalid'>): void {
    assert.strictEqual(ValidationReportOptionsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'report-options-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'report-options-valid'>): void {
    assert.strictEqual(ValidationReportOptionsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'validation-arguments-invalid-top-level'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'validation-arguments-invalid-top-level'>): void {
    assert.strictEqual(ValidationErrorArgumentsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'validation-arguments-invalid-violation'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'validation-arguments-invalid-violation'>): void {
    assert.strictEqual(ValidationErrorArgumentsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'validation-arguments-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'validation-arguments-valid'>): void {
    assert.strictEqual(ValidationErrorArgumentsEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'violation-detail-invalid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'violation-detail-invalid'>): void {
    assert.strictEqual(ValidationViolationDetailEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }

  static 'violation-detail-valid'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'violation-detail-valid'>): void {
    assert.strictEqual(ValidationViolationDetailEntity.validate(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  }
}

ScenarioSuite.register({
  'entity': EntityContractsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'errors entity contracts',
  'runners': EntityContractsRunners
});

void describe('ProblemDetailsEntity.create', () => {
  void it('accepts a plain unbranded literal for the minimum/maximum-constrained status property and validates', () => {
    const result = ProblemDetailsEntity.create({ 'status': 404, 'title': 'Not Found' });
    assert.equal(result.status, 404);
    assert.equal(ProblemDetailsEntity.validate(result), true);
  });
});

void describe('ValidationReportOptionsEntity.create', () => {
  void it('accepts a plain unbranded literal for the minimum/maximum-constrained status property and validates', () => {
    const result = ValidationReportOptionsEntity.create({ 'status': 422 });
    assert.equal(result.status, 422);
    assert.equal(ValidationReportOptionsEntity.validate(result), true);
  });
});
