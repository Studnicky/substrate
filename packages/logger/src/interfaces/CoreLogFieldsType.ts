/**
 * Core fields present on EVERY log record.
 * These enable filtering, correlation, and CloudWatch indexing.
 */

import type { LogEventNameType } from '../types/LogEventNameType.js';
import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Core log fields type for normalized logging.
 */
export type CoreLogFieldsType = {
  /**
   * Hierarchical event identifier: component.operation
   * @example 'api.request', 'queryPlanner.createPlan', 'cache.get'
   */
  'event': LogEventNameType;

  /**
   * Operation outcome (semantic, not HTTP-specific)
   */
  'status': LogStatusType;
};
