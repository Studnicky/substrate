/** A caller-selected registered subscription and optional finite selection evidence. */
export interface TopicSelectionInterface<TId extends string = string> {
  readonly 'id': TId;
  readonly 'origin': string;
  readonly 'scores'?: Readonly<Record<string, number>>;
}
