export interface CandidateSetInterface<TId extends string = string> {
  readonly 'ids': readonly TId[];
  readonly 'origin': string;
}
