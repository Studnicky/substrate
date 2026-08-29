import { RuntimeError } from '@studnicky/errors';

import { NgramExtractor } from '../extractors/NgramExtractor.js';

export class NgramCandidateIndex {
  readonly #idsByNgram = new Map<string, Set<string>>();
  readonly #ngramsById = new Map<string, readonly string[]>();
  readonly #size: number;

  constructor(size: number) {
    if (!Number.isInteger(size) || size <= 0) {
      throw RuntimeError.create('N-gram size must be a positive integer.');
    }
    this.#size = size;
  }

  register(id: string, value: string): void {
    this.unregister(id);
    const ngrams = NgramExtractor.extract(value, this.#size);
    this.#ngramsById.set(id, ngrams);
    for (let index = 0; index < ngrams.length; index += 1) {
      const ngram = ngrams[index];
      if (ngram === undefined) {
        continue;
      }
      const ids = this.#idsByNgram.get(ngram) ?? new Set<string>();
      ids.add(id);
      this.#idsByNgram.set(ngram, ids);
    }
  }

  unregister(id: string): boolean {
    const ngrams = this.#ngramsById.get(id);
    if (ngrams === undefined) {
      return false;
    }
    for (let index = 0; index < ngrams.length; index += 1) {
      const ngram = ngrams[index];
      if (ngram === undefined) {
        continue;
      }
      const ids = this.#idsByNgram.get(ngram);
      if (ids !== undefined) {
        ids.delete(id);
        if (ids.size === 0) {
          this.#idsByNgram.delete(ngram);
        }
      }
    }
    this.#ngramsById.delete(id);
    return true;
  }

  candidates(value: string): readonly string[] {
    const result = new Set<string>();
    const ngrams = NgramExtractor.extract(value, this.#size);
    for (let index = 0; index < ngrams.length; index += 1) {
      const ngram = ngrams[index];
      if (ngram === undefined) {
        continue;
      }
      for (const id of this.#idsByNgram.get(ngram) ?? []) {
        result.add(id);
      }
    }
    return [...result];
  }
}
