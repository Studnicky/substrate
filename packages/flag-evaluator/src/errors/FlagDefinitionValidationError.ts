import { FlagEvaluatorError } from './FlagEvaluatorError.js';

/**
 * Thrown when register() receives a definition that fails FlagDefinitionEntity.validate
 * (e.g. missing defaultValue, or rolloutPercent outside [0,100]).
 */
export class FlagDefinitionValidationError extends FlagEvaluatorError {
  constructor(message: string) {
    super({ 'code': 'flagEvaluator.invalidDefinition', 'message': message, 'retryable': false });
  }
}
