/**
 * HealthEvaluationType — the aggregate result of `HealthRegistry#evaluate()`.
 */

import type { HealthCheckResultType } from './HealthCheckResultType.js';
import type { HealthStatusType } from './HealthStatusType.js';

// json-schema-uninexpressible: 'results' is a ReadonlyMap instance, not a plain JSON object — Map
// keys/values have no JSON Schema representation, and HealthCheckResultType is itself unexpressible.
export type HealthEvaluationType = {
  'results': ReadonlyMap<string, HealthCheckResultType>;
  'status': HealthStatusType;
};
