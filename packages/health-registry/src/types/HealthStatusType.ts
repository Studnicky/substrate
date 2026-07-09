/**
 * HealthStatusType — the tri-state health verdict shared by individual checks and the
 * aggregate registry evaluation.
 */

export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';
