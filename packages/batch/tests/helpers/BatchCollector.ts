/**
 * BatchCollector — collects all batches from an AsyncGenerator into a flat array.
 */
export class BatchCollector {
  static async collect<T>(generator: AsyncGenerator<T[], void, unknown>): Promise<T[]> {
    const results: T[] = [];

    for await (const batch of generator) {
      results.push(...batch);
    }

    return results;
  }
}
