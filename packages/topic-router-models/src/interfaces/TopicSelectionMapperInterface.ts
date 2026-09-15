import type { ScoreEvidenceInterface } from '@studnicky/matching/node';
import type { TopicSelectionInterface } from '@studnicky/topic-router/node';

export interface TopicSelectionMapperInterface<TId extends string = string> {
  map(evidence: readonly ScoreEvidenceInterface<TId>[]): readonly TopicSelectionInterface<TId>[];
}
