import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/browser';

/** Abstract base for all store-package errors. */
export abstract class StoreError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
