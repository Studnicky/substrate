import { RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import { SegmentTree } from './SegmentTree.js';

export class TrieMatcher {
  readonly #tree = new SegmentTree();

  public constructor(pattern: string, delimiter = '.') {
    this.#tree.register('pattern', TrieMatcher.split(pattern, delimiter));
  }

  public static matches(pattern: string, topic: string, delimiter = '.'): boolean {
    const tree = new SegmentTree();
    tree.register('pattern', TrieMatcher.split(pattern, delimiter));
    const result = tree.candidates(TrieMatcher.split(topic, delimiter)).length > 0;
    return result;
  }

  public matches(topic: string, delimiter = '.'): boolean {
    const result = this.#tree.candidates(TrieMatcher.split(topic, delimiter)).length > 0;
    return result;
  }

  private static assertInput(value: string, label: string): void {
    if (!Predicates.isString(value) || value.length === 0) {
      throw RuntimeError.create(`TrieMatcher ${label} must be a non-empty string.`);
    }
  }

  private static split(value: string, delimiter: string): readonly string[] {
    TrieMatcher.assertInput(value, 'value');
    TrieMatcher.assertInput(delimiter, 'delimiter');
    const result = value.split(delimiter);
    return result;
  }
}
