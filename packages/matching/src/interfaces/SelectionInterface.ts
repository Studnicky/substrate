export interface SelectionInterface<TId extends string = string> {
  readonly 'id': TId;
  readonly 'origin': string;
  readonly 'scores'?: Readonly<Record<string, number>>;
}
