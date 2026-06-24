/**
 * @packageDocumentation
 * Scheduler primitives for real-time and deterministic virtual scheduling.
 */
export { SchedulerError } from './errors/index.js';
export type { ScheduledTaskType } from './interfaces/index.js';
export type { SchedulerProviderType } from './interfaces/index.js';
export { RealTimeScheduler } from './scheduler/index.js';
export { VirtualScheduler } from './scheduler/index.js';
