/** Static utilities for async iterables: merge, filter, enrich. */

export class AsyncIter {
  /** FIFO merge of N async iterables in arrival order. */
  static async *merge<T>(...sources: AsyncIterable<T>[]): AsyncGenerator<T> {
    if (sources.length === 0) { return; }

    type QueueEntry = { 'value': T; 'variant': 'value'; } | { 'variant': 'done' } | { 'error': unknown; 'variant': 'error'; };

    const queue: QueueEntry[] = [];
    let notify: (() => void) | null = null;

    function enqueue(entry: QueueEntry): void {
      queue.push(entry);
      if (notify !== null) { const n = notify; notify = null; n(); }
    }

    async function drainSource(sourceIterator: AsyncIterable<T>): Promise<void> {
      try {
        for await (const value of sourceIterator) { enqueue({ 'value': value, 'variant': 'value' }); }
        enqueue({ 'variant': 'done' });
      } catch (error: unknown) {
        enqueue({ 'error': error, 'variant': 'error' });
      }
    }

    let active = sources.length;
    const sourcesLen = sources.length;
    for (let i = 0; i < sourcesLen; i += 1) {
      void drainSource(sources[i]!);
    }

    while (active > 0 || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => { notify = resolve; });
      }
      const entry = queue.shift();
      if (entry === undefined) { continue; }
      if (entry.variant === 'error') { throw entry.error; }
      if (entry.variant === 'done') { active -= 1; }
      if (entry.variant === 'value') { yield entry.value; }
    }
  }

  /** Yield items for which predicate returns true (sync or async). */
  static async *filter<T>(
    sourceIterator: AsyncIterable<T>,
    predicate: (item: T) => boolean | Promise<boolean>
  ): AsyncGenerator<T> {
    for await (const item of sourceIterator) {
      if (await predicate(item)) { yield item; }
    }
  }

  /** Left-join enrichment: lookup per item; if non-null, merge item+enrichment; else yield item unchanged. */
  static async *enrich<T, E, R>(
    sourceIterator: AsyncIterable<T>,
    lookup: (item: T) => Promise<E | null>,
    merge: (item: T, enrichment: E) => R
  ): AsyncGenerator<T | R> {
    for await (const item of sourceIterator) {
      const enrichment = await lookup(item);
      if (enrichment !== null) { yield merge(item, enrichment); }
      else { yield item; }
    }
  }
}
