/**
 * HealthCheckType — the shape of a single registered check function.
 */

import type { HealthCheckResultType } from './HealthCheckResultType.js';

export type HealthCheckType = () => Promise<HealthCheckResultType>;
