/**
 * HealthEvaluationType — the aggregate result of `HealthRegistry#evaluate()`.
 */

import type { HealthCheckResultType } from './HealthCheckResultType.js';
import type { HealthStatusType } from './HealthStatusType.js';

export type HealthEvaluationType = {
  'results': ReadonlyMap<string, HealthCheckResultType>;
  'status': HealthStatusType;
};
