/**
 * Typed collaborators `FetchClientConfiguration.intake()` accepts alongside schema data.
 */

import type { ClockProviderInterface } from '@studnicky/clock/interfaces';
import type { SignalInterface } from '@studnicky/signal/interfaces';

import type { RequestIdGeneratorInterface } from './RequestIdGeneratorInterface.js';

export interface ConfigurationCollaboratorsInterface {
  'clock'?: ClockProviderInterface;
  'requestIdGenerator'?: RequestIdGeneratorInterface;
  'signal'?: SignalInterface;
}
