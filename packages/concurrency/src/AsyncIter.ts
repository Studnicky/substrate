/** Static utilities for async iterables: merge, filter, enrich. */

import { CircularBuffer } from '@studnicky/circular-buffer';

import type { AsyncIterDoneDiscriminantEntity } from './entities/AsyncIterDoneDiscriminantEntity.js';
import type { AsyncIterErrorDiscriminantEntity } from './entities/AsyncIterErrorDiscriminantEntity.js';
import type { AsyncIterValueDiscriminantEntity } from './entities/AsyncIterValueDiscriminantEntity.js';

interface QueueDoneEntryInterface {
  readonly 'variant': AsyncIterDoneDiscriminantEntity.Type['variant'];
}

interface QueueErrorEntryInterface {
  readonly 'error': unknown;
  readonly 'variant': AsyncIterErrorDiscriminantEntity.Type['variant'];
}

interface QueueValueEntryInterface<T> {
  readonly 'value': T;
  readonly 'variant': AsyncIterValueDiscriminantEntity.Type['variant'];
}

interface MergeQueueSinkInterface<T> {
  'notify': (() => void) | null;
  readonly 'queue': CircularBuffer<QueueDoneEntryInterface | QueueErrorEntryInterface | QueueValueEntryInterface<T>>;
}

class MergeQueue {
  static enqueue<T>(
    sink: MergeQueueSinkInterface<T>,
    entry: QueueDoneEntryInterface | QueueErrorEntryInterface | QueueValueEntryInterface<T>
  ): void {
    sink.queue.push(entry);
    if (sink.notify !== null) {
      const n = sink.notify;
      sink.notify = null;
      n();
    }
  }

  static async drainSource<T>(sink: MergeQueueSinkInterface<T>, sourceIterator: AsyncIterable<T>): Promise<void> {
    try {
      for await (const value of sourceIterator) { MergeQueue.enqueue(sink, { 'value': value, 'variant': 'value' }); }
      MergeQueue.enqueue(sink, { 'variant': 'done' });
    } catch (error: unknown) {
      MergeQueue.enqueue(sink, { 'error': error, 'variant': 'error' });
    }
  }

  static async awaitNotify<T>(sink: MergeQueueSinkInterface<T>): Promise<void> {
    await new Promise<void>((resolve) => { sink.notify = resolve; });
  }
}

export class AsyncIter {
  /** FIFO merge of N async iterables in arrival order. */
  static async *merge<T>(...sources: AsyncIterable<T>[]): AsyncGenerator<T> {
    if (sources.length === 0) { return; }

    const sink: MergeQueueSinkInterface<T> = {
      'notify': null,
      'queue': CircularBuffer.create<QueueDoneEntryInterface | QueueErrorEntryInterface | QueueValueEntryInterface<T>>({ 'overflow': 'grow' })
    };

    let active = sources.length;
    const sourceLength = sources.length;
    for (let i = 0; i < sourceLength; i += 1) {
      const source = sources.at(i);
      if (source !== undefined) { void MergeQueue.drainSource(sink, source); }
    }

    while (active > 0 || sink.queue.length > 0) {
      if (sink.queue.length === 0) {
        await MergeQueue.awaitNotify(sink);
      }
      const entry = sink.queue.shift();
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
