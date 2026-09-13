import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors/node';

/**
 * Abstract base class for all flag-evaluator errors.
 */
export abstract class FlagEvaluatorError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
