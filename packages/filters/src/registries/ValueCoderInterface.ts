export interface ValueCoderInterface<TValue> {
  guard(value: unknown): value is TValue;
}
