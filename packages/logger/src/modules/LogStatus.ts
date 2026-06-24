import type {
  FailureStatusType,
  LifecycleStatusType,
  LogStatusType,
  SuccessStatusType
} from '../types/LogStatusType.js';

import { STATUS_CATEGORIES } from '../constants/LOG_STATUS.js';

/**
 * Type predicates for narrowing LogStatusType values.
 */
export class LogStatus {
  /**
   * Type predicate that checks if a status indicates a successful outcome.
   *
   * @param status - The status to check
   * @returns True if the status is a success status, with type narrowing
   */
  public static isSuccess(status: LogStatusType): status is SuccessStatusType {
    if (typeof status !== 'string') {
      return false;
    }

    return (STATUS_CATEGORIES.SUCCESS as readonly string[]).includes(status);
  }

  /**
   * Type predicate that checks if a status indicates a failure outcome.
   *
   * @param status - The status to check
   * @returns True if the status is a failure status, with type narrowing
   */
  public static isFailure(status: LogStatusType): status is FailureStatusType {
    if (typeof status !== 'string') {
      return false;
    }

    return (STATUS_CATEGORIES.FAILURE as readonly string[]).includes(status);
  }

  /**
   * Type predicate that checks if a status indicates a lifecycle state.
   *
   * @param status - The status to check
   * @returns True if the status is a lifecycle status, with type narrowing
   */
  public static isLifecycle(status: LogStatusType): status is LifecycleStatusType {
    if (typeof status !== 'string') {
      return false;
    }

    return (STATUS_CATEGORIES.LIFECYCLE as readonly string[]).includes(status);
  }
}
