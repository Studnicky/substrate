import type { ErrorClassificationType } from './ErrorClassificationType.js';

/**
 * Function that classifies errors to determine retry behavior and categorization.
 */
export type ErrorClassifierFunctionType = (error: Error, attemptNumber: number) => ErrorClassificationType;
