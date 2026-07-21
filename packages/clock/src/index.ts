/**
 * @studnicky/clock — Wall-clock and monotonic time primitives with injectable providers.
 *
 * @module
 */
export { Clock } from './clock/index.js';
export { RealTimeClockProvider } from './clock/index.js';
export { VirtualClockProvider } from './clock/index.js';
export { VirtualTimeCounter } from './clock/index.js';
export { RealTimeClockProviderOptionsEntity } from './entities/RealTimeClockProviderOptionsEntity.js';
export { VirtualTimeCounterOptionsEntity } from './entities/VirtualTimeCounterOptionsEntity.js';
export { ClockError } from './errors/index.js';
export type { ClockProviderInterface } from './interfaces/index.js';
