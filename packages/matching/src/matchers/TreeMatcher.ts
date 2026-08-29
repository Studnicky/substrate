import { Predicates } from '@studnicky/types';

import { SegmentTree } from './SegmentTree.js';

export class TreeMatcher {
  readonly #tree = new SegmentTree();

  public static matches(pattern: string, topic: string, delimiter = '.'): boolean {
    const tree = new SegmentTree();
    tree.register('pattern', TreeMatcher.split(pattern, delimiter));
    const result = tree.candidates(TreeMatcher.split(topic, delimiter)).length > 0;
    return result;
  }

  public candidates(topic: string, delimiter = '.'): readonly string[] {
    const result = this.#tree.candidates(TreeMatcher.split(topic, delimiter));
    return result;
  }

  public register(id: string, pattern: string, delimiter = '.'): void {
    TreeMatcher.assertInput(id, 'id');
    TreeMatcher.assertInput(pattern, 'pattern');
    this.#tree.register(id, TreeMatcher.split(pattern, delimiter));
  }

  public unregister(id: string): boolean {
    TreeMatcher.assertInput(id, 'id');
    const result = this.#tree.unregister(id);
    return result;
  }

  private static assertInput(value: string, label: string): void {
    if (!Predicates.isString(value) || value.length === 0) {
      throw new TypeError(`TreeMatcher ${label} must be a non-empty string.`);
    }
  }

  private static split(value: string, delimiter: string): readonly string[] {
    TreeMatcher.assertInput(value, 'value');
    TreeMatcher.assertInput(delimiter, 'delimiter');
    const result = value.split(delimiter);
    return result;
  }
}
