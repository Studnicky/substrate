import type { ClockProviderInterface } from '@studnicky/clock/browser';
import type {
  ErrorClassifierFunctionInterface,
  ErrorClassifierInterface
} from '@studnicky/errors/browser';

/** Typed collaborators Retry receives through its construction options. */
export interface RetryCollaboratorsInterface {
  readonly 'clock'?: ClockProviderInterface;
  readonly 'errorClassifier': ErrorClassifierFunctionInterface | ErrorClassifierInterface;
}
