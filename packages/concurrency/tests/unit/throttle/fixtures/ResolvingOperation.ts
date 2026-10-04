export class ResolvingOperation {
  /** An operation that resolves `value` on every call. */
  static of<TValue>(value: TValue): () => Promise<TValue> {
    const operation = (): Promise<TValue> => {
      const settled = Promise.resolve(value);
      return settled;
    };
    return operation;
  }
}
