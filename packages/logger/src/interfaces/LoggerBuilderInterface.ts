import type { LoggerInterface } from './LoggerInterface.js';

/**
 * Base interface for logger builders.
 *
 * Defines the common build method contract for all logger builder types.
 */
export interface LoggerBuilderInterface<T extends LoggerInterface> {
  build(): T;
}
