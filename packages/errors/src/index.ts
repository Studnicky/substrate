/**
 * @module @studnicky/errors
 * @description Standardized error handling for all modules in the monorepo
 */

export {
  DefaultHttpErrorClassifier,
  DefaultHttpErrorClassifierBuilder,
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
  HTTP_UNAUTHORIZED,
  HttpStatus
} from './constants/index.js';
export {
  BaseError,
  CliExitError,
  ErrorCodeRegistry,
  ModuleError,
  ValidationError,
  ValidationErrors,
  ValidationErrorsBuilder
} from './errors/index.js';
export type {
  ErrorClassifierInterface,
  ModuleErrorInterface
} from './interfaces/index.js';
export type {
  BaseErrorArgumentsType,
  ErrorClassificationType,
  ErrorClassifierFunctionType,
  ErrorCodeDescriptorType,
  ErrorScenarioType,
  ErrorWithAddressType,
  ErrorWithCodeType,
  ErrorWithErrnoType,
  ErrorWithHostnameType,
  ErrorWithPortType,
  ErrorWithRetryAfterType,
  ErrorWithStatusCodeType,
  ErrorWithStatusType,
  ErrorWithSyscallType,
  ModuleErrorCreateOptionsType,
  ModuleErrorOptionsType,
  SerializedErrorType,
  ValidationAggregateViewType,
  ValidationErrorArgumentsType,
  ValidationProblemDetailsType,
  ValidationReportOptionsType,
  ValidationViolationDetailType,
  ValidationViolationType
} from './types/index.js';
export { errorTypeGuards } from './validation/errorTypeGuards.js';
export { isErrorClassification } from './validation/isErrorClassification.js';
