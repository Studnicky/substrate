import type { HealthStatusEntity } from '../entities/HealthStatusEntity.js';

/** Outcome of a single named check. */
export interface HealthCheckResultInterface {
  'metadata'?: unknown;
  'status': HealthStatusEntity.Type;
}
