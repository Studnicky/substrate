import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';

/**
 * Function that classifies errors to determine retry behavior and categorization.
 */
export type ErrorClassifierFunctionType = (error: Error, attemptNumber: number) => ErrorClassificationEntity.Type;
