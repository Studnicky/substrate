import type { ErrorDefaults } from '../constants/index.js';

/**
 * Error scenario types - keys from ErrorDefaults
 */
export type ErrorScenarioType = keyof typeof ErrorDefaults;
