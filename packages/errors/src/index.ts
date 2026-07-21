/**
 * @module @studnicky/errors
 * @description Standardized error handling for all modules in the monorepo
 */

export {
  DefaultHttpErrorClassifier,
  ErrorClassifier,
  matchers
} from './classifiers/index.js';
export {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL,
  EARLY_RETRY_THRESHOLD,
  EMPTY_LENGTH,
  ErrorCode,
  ErrorDefaults,
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
  HTTP_SUCCESS_START,
  HttpStatus
} from './constants/index.js';
export { ErrorClassificationEntity } from './entities/ErrorClassificationEntity.js';
export { ErrorCodeDescriptorEntity } from './entities/ErrorCodeDescriptorEntity.js';
export { ErrorDiagnosticEntity } from './entities/ErrorDiagnosticEntity.js';
export { ErrorWithAddressEntity } from './entities/ErrorWithAddressEntity.js';
export { ErrorWithCodeEntity } from './entities/ErrorWithCodeEntity.js';
export { ErrorWithErrnoEntity } from './entities/ErrorWithErrnoEntity.js';
export { ErrorWithHostnameEntity } from './entities/ErrorWithHostnameEntity.js';
export { ErrorWithPortEntity } from './entities/ErrorWithPortEntity.js';
export { ErrorWithRetryAfterEntity } from './entities/ErrorWithRetryAfterEntity.js';
export { ErrorWithStatusCodeEntity } from './entities/ErrorWithStatusCodeEntity.js';
export { ErrorWithStatusEntity } from './entities/ErrorWithStatusEntity.js';
export { ErrorWithSyscallEntity } from './entities/ErrorWithSyscallEntity.js';
export { HookInvokerOptionsEntity } from './entities/HookInvokerOptionsEntity.js';
export { ValidationAggregateViewEntity } from './entities/ValidationAggregateViewEntity.js';
export { ValidationErrorArgumentsEntity } from './entities/ValidationErrorArgumentsEntity.js';
export { ValidationProblemDetailsEntity } from './entities/ValidationProblemDetailsEntity.js';
export { ValidationReportOptionsEntity } from './entities/ValidationReportOptionsEntity.js';
export { ValidationViolationDetailEntity } from './entities/ValidationViolationDetailEntity.js';
export { ValidationViolationEntity } from './entities/ValidationViolationEntity.js';
export {
  BaseError,
  CliExitError,
  DomainErrorArgs,
  HookInvocationError,
  HookInvoker,
  HookTimeoutError,
  ModuleError,
  ReentrantHookInvocationError,
  ValidationError,
  ValidationErrors
} from './errors/index.js';
export type {
  BaseErrorArgumentsInterface,
  DomainErrorOptionsInterface,
  ErrorClassifierFunctionInterface,
  ErrorClassifierInterface,
  ModuleErrorCreateOptionsInterface,
  ModuleErrorInterface,
  ModuleErrorOptionsInterface
} from './interfaces/index.js';
export { EventRecorder } from './observers/EventRecorder.js';
export { errorTypeGuards } from './validation/errorTypeGuards.js';
export { ErrorClassificationGuard } from './validation/isErrorClassification.js';
