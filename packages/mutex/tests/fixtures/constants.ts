/**
 * Shared test fixture constants for @studnicky/mutex tests
 */

import type { MutexConfigInterface } from '../../src/interfaces/MutexConfigInterface.js';

export const defaultConfig: Partial<MutexConfigInterface> = {};

export const fullConfig: Partial<MutexConfigInterface> = {
  maxQueueSize: 100,
  timeout: 5000
};

export const mediumQueueConfig: Partial<MutexConfigInterface> = {
  maxQueueSize: 10,
  timeout: 5000
};

export const coalescingConfig: Partial<MutexConfigInterface> = {
  enableCoalescing: true
};
