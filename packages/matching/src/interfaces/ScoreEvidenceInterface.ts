export interface ScoreEvidenceInterface<TId extends string = string> {
  readonly 'id': TId;
  readonly 'origin': string;
  readonly 'score': number;
}
