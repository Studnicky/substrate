import type { TopicCandidateSourceInterface } from '../interfaces/TopicCandidateSourceInterface.js';
import type { TopicMatcherInterface } from '../interfaces/TopicMatcherInterface.js';

export interface TopicRouterOptionsInterface {
  readonly 'candidateSource'?: TopicCandidateSourceInterface;
  readonly 'matcher'?: TopicMatcherInterface;
}
