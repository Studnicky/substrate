/**
 * Shared test fixture constants for @studnicky/mutex tests
 */

import type { MutexConfigEntity } from '../../src/entities/MutexConfigEntity.js';

export const defaultConfig: Partial<MutexConfigEntity.InputType> = {};

export const fullConfig: Partial<MutexConfigEntity.InputType> = {
  maximumQueueSize: 100,
  timeout: 5000
};

export const mediumQueueConfig: Partial<MutexConfigEntity.InputType> = {
  maximumQueueSize: 10,
  timeout: 5000
};

export const coalescingConfig: Partial<MutexConfigEntity.InputType> = {
  enableCoalescing: true
};
