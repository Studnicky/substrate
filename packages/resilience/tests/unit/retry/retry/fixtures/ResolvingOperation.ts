export class ResolvingOperation {
  /** An operation that resolves `value` on every call. */
  static of(value: string): () => Promise<string> {
    const operation = (): Promise<string> => {
      const settled = Promise.resolve(value);
      return settled;
    };
    return operation;
  }
}
