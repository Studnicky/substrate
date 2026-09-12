import type { ScoreEvidenceInterface } from '@studnicky/matching/node';

export interface TopicInferenceInterface<TInput, TId extends string = string> {
  infer(input: TInput): Promise<readonly ScoreEvidenceInterface<TId>[]>;
}
