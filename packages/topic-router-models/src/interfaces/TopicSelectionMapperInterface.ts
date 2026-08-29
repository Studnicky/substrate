import type { ScoreEvidenceInterface } from '@studnicky/matching';
import type { TopicSelectionInterface } from '@studnicky/topic-router';

export interface TopicSelectionMapperInterface<TId extends string = string> {
  map(evidence: readonly ScoreEvidenceInterface<TId>[]): readonly TopicSelectionInterface<TId>[];
}
