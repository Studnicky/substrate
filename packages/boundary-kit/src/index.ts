/**
 * @studnicky/boundary-kit
 *
 * Composes throttle, circuit breaker, and retry into a fixed-order boundary call pattern.
 */

export { BoundaryKit } from './BoundaryKit.js';
export { BoundaryKitBuilder } from './BoundaryKitBuilder.js';
export { BoundaryKitAbortedError } from './errors/BoundaryKitAbortedError.js';
export type { BoundaryKitConfigType } from './types/BoundaryKitConfigType.js';
