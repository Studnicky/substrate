import type { LogStatusEntity } from '../entities/LogStatusEntity.js';

import { FailureStatusEntity } from '../entities/FailureStatusEntity.js';
import { LifecycleStatusEntity } from '../entities/LifecycleStatusEntity.js';
import { SuccessStatusEntity } from '../entities/SuccessStatusEntity.js';

/**
 * Type predicates for narrowing log status entity values.
 */
export class LogStatus {
  /**
   * Type predicate that checks if a status indicates a successful outcome.
   *
   * @param status - The status to check
   * @returns True if the status is a success status, with type narrowing
   */
  public static isSuccess(status: LogStatusEntity.Type): status is SuccessStatusEntity.Type {
    const result = SuccessStatusEntity.validate(status);
    return result;
  }

  /**
   * Type predicate that checks if a status indicates a failure outcome.
   *
   * @param status - The status to check
   * @returns True if the status is a failure status, with type narrowing
   */
  public static isFailure(status: LogStatusEntity.Type): status is FailureStatusEntity.Type {
    const result = FailureStatusEntity.validate(status);
    return result;
  }

  /**
   * Type predicate that checks if a status indicates a lifecycle state.
   *
   * @param status - The status to check
   * @returns True if the status is a lifecycle status, with type narrowing
   */
  public static isLifecycle(status: LogStatusEntity.Type): status is LifecycleStatusEntity.Type {
    const result = LifecycleStatusEntity.validate(status);
    return result;
  }
}
