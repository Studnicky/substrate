/**
 * @studnicky/throttle
 * Generic async operation throttle with sliding window concurrency control
 */

export {
  ThrottleAbortedError,
  ThrottleDrainingError
} from './errors/index.js';
export type { ThrottleInterface } from './interfaces/ThrottleInterface.js';
export { Throttle } from './throttle/Throttle.js';
