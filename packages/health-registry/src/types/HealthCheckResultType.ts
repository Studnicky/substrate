/**
 * HealthCheckResultType — the outcome of a single named check, whether it resolved
 * normally, rejected, or exceeded its configured timeout.
 */

import type { HealthStatusType } from './HealthStatusType.js';

export type HealthCheckResultType = {
  'metadata'?: unknown;
  'status': HealthStatusType;
};
