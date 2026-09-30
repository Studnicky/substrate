/**
 * Shared test fixture constants for @studnicky/mutex tests
 */

import type { MutexConfigEntity } from '../../src/entities/MutexConfigEntity.js';

export const DEFAULT_CONFIG: MutexConfigEntity.InputType = {};

export const FULL_CONFIG: MutexConfigEntity.InputType = {
  'maximumQueueSize': 100,
  'timeout': 5000
};

export const MEDIUM_QUEUE_CONFIG: MutexConfigEntity.InputType = {
  'maximumQueueSize': 10,
  'timeout': 5000
};

export const COALESCING_CONFIG: MutexConfigEntity.InputType = {
  'enableCoalescing': true
};
