import type { ScoreEvidenceInterface } from '@studnicky/matching/browser';

import type { TopicSelectionInterface } from '../interfaces/TopicSelectionInterface.js';

export interface TopicSelectionMapperInterface<TId extends string = string> {
  map(evidence: readonly ScoreEvidenceInterface<TId>[]): readonly TopicSelectionInterface<TId>[];
}
