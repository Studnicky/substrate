/** Isomorphic promisified delay using the global setTimeout. */
export class Delay {
  static for(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
  }
}
