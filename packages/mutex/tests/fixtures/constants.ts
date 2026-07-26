/**
 * Shared test fixture constants for @studnicky/mutex tests
 */

import type { MutexConfigEntity } from '../../src/entities/MutexConfigEntity.js';

export const defaultConfig: Partial<MutexConfigEntity.Type> = {};

export const fullConfig: Partial<MutexConfigEntity.Type> = {
  maxQueueSize: 100,
  timeout: 5000
};

export const mediumQueueConfig: Partial<MutexConfigEntity.Type> = {
  maxQueueSize: 10,
  timeout: 5000
};

export const coalescingConfig: Partial<MutexConfigEntity.Type> = {
  enableCoalescing: true
};
