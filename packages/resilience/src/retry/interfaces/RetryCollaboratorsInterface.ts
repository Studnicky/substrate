import type { ClockProviderInterface, ErrorClassifierFunctionInterface, ErrorClassifierInterface } from '#runtime';

/** Typed collaborators Retry receives through its construction options. */
export interface RetryCollaboratorsInterface {
  readonly 'clock'?: ClockProviderInterface;
  readonly 'errorClassifier': ErrorClassifierFunctionInterface | ErrorClassifierInterface;
}
