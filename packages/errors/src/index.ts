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
} from './constants/ClassifierConstants.js';
export {
  ErrorCode,
  ErrorDefaults,
  HttpStatus
} from './constants/index.js';
export {
  BaseError,
  CliExitError,
  DomainErrorArgumentList,
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
  ModuleErrorOptionsInterface
} from './interfaces/index.js';
export { EventRecorder } from './observers/EventRecorder.js';
export { ErrorClassificationGuard } from './validation/ErrorClassificationGuard.js';
export { errorTypeGuards } from './validation/errorTypeGuards.js';
