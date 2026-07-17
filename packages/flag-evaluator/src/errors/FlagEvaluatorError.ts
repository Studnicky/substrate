import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

/**
 * Abstract base class for all flag-evaluator errors.
 */
export abstract class FlagEvaluatorError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}
