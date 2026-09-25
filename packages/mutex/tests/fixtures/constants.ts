/**
 * Shared test fixture constants for @studnicky/mutex tests
 */

import type { MutexConfigEntity } from '../../src/entities/MutexConfigEntity.js';

export const defaultConfig: MutexConfigEntity.InputType = {};

export const fullConfig: MutexConfigEntity.InputType = {
  maximumQueueSize: 100,
  timeout: 5000
};

export const mediumQueueConfig: MutexConfigEntity.InputType = {
  maximumQueueSize: 10,
  timeout: 5000
};

export const coalescingConfig: MutexConfigEntity.InputType = {
  enableCoalescing: true
};
