import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ErrorWithCodeEntity } from '../../src/entities/ErrorWithCodeEntity.js';
import { ErrorWithAddressEntity } from '../../src/entities/ErrorWithAddressEntity.js';
import { ErrorWithErrnoEntity } from '../../src/entities/ErrorWithErrnoEntity.js';
import { ErrorWithHostnameEntity } from '../../src/entities/ErrorWithHostnameEntity.js';
import { ErrorWithPortEntity } from '../../src/entities/ErrorWithPortEntity.js';
import { ErrorWithRetryAfterEntity } from '../../src/entities/ErrorWithRetryAfterEntity.js';
import { ErrorDiagnosticEntity } from '../../src/entities/ErrorDiagnosticEntity.js';
import { ErrorWithStatusCodeEntity } from '../../src/entities/ErrorWithStatusCodeEntity.js';
import { ErrorWithStatusEntity } from '../../src/entities/ErrorWithStatusEntity.js';
import { ErrorWithSyscallEntity } from '../../src/entities/ErrorWithSyscallEntity.js';
import { ErrorClassificationEntity } from '../../src/entities/ErrorClassificationEntity.js';
import { ErrorCodeDescriptorEntity } from '../../src/entities/ErrorCodeDescriptorEntity.js';
import { ValidationViolationDetailEntity } from '../../src/entities/ValidationViolationDetailEntity.js';
import { ValidationAggregateViewEntity } from '../../src/entities/ValidationAggregateViewEntity.js';
import { ValidationProblemDetailsEntity } from '../../src/entities/ValidationProblemDetailsEntity.js';
import { ValidationReportOptionsEntity } from '../../src/entities/ValidationReportOptionsEntity.js';
import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'error-with-address-invalid' | 'error-with-address-valid' | 'error-with-code-invalid' | 'error-with-code-valid' | 'error-with-errno-invalid' | 'error-with-errno-valid' | 'error-with-hostname-invalid' | 'error-with-hostname-valid' | 'error-with-port-invalid' | 'error-with-port-valid' | 'error-with-retry-after-invalid' | 'error-with-retry-after-valid' | 'error-with-status-invalid' | 'error-with-status-valid' | 'error-with-status-code-invalid' | 'error-with-status-code-valid' | 'error-with-syscall-invalid' | 'error-with-syscall-valid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'error-diagnostic-valid' | 'error-diagnostic-valid-no-stack' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'error-diagnostic-invalid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'error-classification-valid' | 'error-classification-invalid' | 'error-code-descriptor-valid' | 'error-code-descriptor-invalid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'violation-detail-valid' | 'violation-detail-invalid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'aggregate-view-valid' | 'aggregate-view-invalid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'report-options-valid' | 'report-options-invalid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'problem-details-valid' | 'problem-details-valid-empty-errors' | 'problem-details-invalid' | 'problem-details-invalid-item' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'validation-arguments-valid' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'validation-arguments-invalid-top-level' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'validation-arguments-invalid-violation' };

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function validateValue(validator: (value: unknown) => boolean): ScenarioRunner {
  return (scenarioCase) => {
    assert.strictEqual(validator(scenarioCase.input.value), Boolean(scenarioCase.expected.valid));
  };
}

const runErrorWithAddress = validateValue((value) => ErrorWithAddressEntity.validate(value));
const runErrorWithCode = validateValue((value) => ErrorWithCodeEntity.validate(value));
const runErrorWithErrno = validateValue((value) => ErrorWithErrnoEntity.validate(value));
const runErrorWithHostname = validateValue((value) => ErrorWithHostnameEntity.validate(value));
const runErrorWithPort = validateValue((value) => ErrorWithPortEntity.validate(value));
const runErrorWithRetryAfter = validateValue((value) => ErrorWithRetryAfterEntity.validate(value));
const runErrorWithStatus = validateValue((value) => ErrorWithStatusEntity.validate(value));
const runErrorWithStatusCode = validateValue((value) => ErrorWithStatusCodeEntity.validate(value));
const runErrorWithSyscall = validateValue((value) => ErrorWithSyscallEntity.validate(value));

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'aggregate-view-invalid': validateValue((value) => ValidationAggregateViewEntity.validate(value)),
  'aggregate-view-valid': validateValue((value) => ValidationAggregateViewEntity.validate(value)),
  'error-classification-invalid': validateValue((value) => ErrorClassificationEntity.validate(value)),
  'error-classification-valid': validateValue((value) => ErrorClassificationEntity.validate(value)),
  'error-code-descriptor-invalid': validateValue((value) => ErrorCodeDescriptorEntity.validate(value)),
  'error-code-descriptor-valid': validateValue((value) => ErrorCodeDescriptorEntity.validate(value)),
  'error-diagnostic-invalid': (scenarioCase) => {
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.missingName), Boolean(scenarioCase.expected.missingName));
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.missingMessage), Boolean(scenarioCase.expected.missingMessage));
    assert.strictEqual(ErrorDiagnosticEntity.validate(scenarioCase.input.badStack), Boolean(scenarioCase.expected.badStack));
  },
  'error-diagnostic-valid': validateValue((value) => ErrorDiagnosticEntity.validate(value)),
  'error-diagnostic-valid-no-stack': validateValue((value) => ErrorDiagnosticEntity.validate(value)),
  'error-with-address-invalid': runErrorWithAddress,
  'error-with-address-valid': runErrorWithAddress,
  'error-with-code-invalid': runErrorWithCode,
  'error-with-code-valid': runErrorWithCode,
  'error-with-errno-invalid': runErrorWithErrno,
  'error-with-errno-valid': runErrorWithErrno,
  'error-with-hostname-invalid': runErrorWithHostname,
  'error-with-hostname-valid': runErrorWithHostname,
  'error-with-port-invalid': runErrorWithPort,
  'error-with-port-valid': runErrorWithPort,
  'error-with-retry-after-invalid': runErrorWithRetryAfter,
  'error-with-retry-after-valid': runErrorWithRetryAfter,
  'error-with-status-code-invalid': runErrorWithStatusCode,
  'error-with-status-code-valid': runErrorWithStatusCode,
  'error-with-status-invalid': runErrorWithStatus,
  'error-with-status-valid': runErrorWithStatus,
  'error-with-syscall-invalid': runErrorWithSyscall,
  'error-with-syscall-valid': runErrorWithSyscall,
  'problem-details-invalid': validateValue((value) => ValidationProblemDetailsEntity.validate(value)),
  'problem-details-invalid-item': validateValue((value) => ValidationProblemDetailsEntity.validate(value)),
  'problem-details-valid': validateValue((value) => ValidationProblemDetailsEntity.validate(value)),
  'problem-details-valid-empty-errors': validateValue((value) => ValidationProblemDetailsEntity.validate(value)),
  'report-options-invalid': validateValue((value) => ValidationReportOptionsEntity.validate(value)),
  'report-options-valid': validateValue((value) => ValidationReportOptionsEntity.validate(value)),
  'validation-arguments-invalid-top-level': validateValue((value) => ValidationErrorArgumentsEntity.validate(value)),
  'validation-arguments-invalid-violation': validateValue((value) => ValidationErrorArgumentsEntity.validate(value)),
  'validation-arguments-valid': validateValue((value) => ValidationErrorArgumentsEntity.validate(value)),
  'violation-detail-invalid': validateValue((value) => ValidationViolationDetailEntity.validate(value)),
  'violation-detail-valid': validateValue((value) => ValidationViolationDetailEntity.validate(value))
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('errors entity contracts', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario as ScenarioCase);
    });
  }
});
