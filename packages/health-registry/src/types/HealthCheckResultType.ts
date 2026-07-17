/**
 * HealthCheckResultType — the outcome of a single named check, whether it resolved
 * normally, rejected, or exceeded its configured timeout.
 */

import type { HealthStatusType } from './HealthStatusType.js';

// json-schema-uninexpressible: 'metadata' is intentionally 'unknown' (arbitrary caller-supplied diagnostic
// data, including thrown Error instances) — JSON Schema cannot express an unconstrained-shape field.
export type HealthCheckResultType = {
  'metadata'?: unknown;
  'status': HealthStatusType;
};
