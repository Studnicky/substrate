
import { ConfigurationError, Predicates } from '#runtime';

import type { BackoffStrategyOptionsInterface } from '../interfaces/BackoffStrategyOptionsInterface.js';

import { BackoffConfigEntity } from '../entities/BackoffConfigEntity.js';

/** Validates a construction option's `backoffStrategy` shape before `Retry` trusts it. */
class RetryBackoffStrategyGuard {
  public static validate(options: BackoffStrategyOptionsInterface): void {
    const { backoffStrategy } = options;

    if (backoffStrategy === undefined) {
      return;
    }
    if (!Predicates.isObject(backoffStrategy)) {
      throw ConfigurationError.create('backoffStrategy must be an object with strategy and baseDelayMs');
    }

    const strategy: unknown = Reflect.get(backoffStrategy, 'strategy');

    if (!Predicates.isFunction(strategy)) {
      throw ConfigurationError.create('backoffStrategy.strategy must be a function');
    }

    const baseDelayMs: unknown = Reflect.get(backoffStrategy, 'baseDelayMs');
    BackoffConfigEntity.intake({ 'baseDelayMs': baseDelayMs });
  }
}

export { RetryBackoffStrategyGuard };
