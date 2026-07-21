import type { HealthCheckResultInterface } from './HealthCheckResultInterface.js';

/** Callable contract for a registered health check. */
export interface HealthCheckInterface {
  (): Promise<HealthCheckResultInterface>;
}
