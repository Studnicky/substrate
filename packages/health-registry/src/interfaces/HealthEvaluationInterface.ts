import type { HealthStatusEntity } from '../entities/HealthStatusEntity.js';
import type { HealthCheckResultInterface } from './HealthCheckResultInterface.js';

/** Aggregate result returned by `HealthRegistry#evaluate()`. */
export interface HealthEvaluationInterface {
  readonly 'results': ReadonlyMap<string, HealthCheckResultInterface>;
  readonly 'status': HealthStatusEntity.Type;
}
