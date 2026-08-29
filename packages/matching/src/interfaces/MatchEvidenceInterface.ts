export interface MatchEvidenceInterface<TId extends string = string> {
  readonly 'id': TId;
  readonly 'matched': boolean;
  readonly 'origin': string;
}
