import { Predicates } from '@studnicky/types';

export class AhoCorasickMatcher {
  readonly #root = new AhoCorasickNode();

  constructor(patterns: ReadonlyMap<string, string>) {
    for (const [pattern, id] of patterns) {
      this.insert(pattern, id);
    }
    this.buildFailureLinks();
  }

  find(value: string): readonly string[] {
    if (!Predicates.isString(value)) {
      throw new TypeError('AhoCorasickMatcher requires a string value.');
    }
    const results = new Set<string>();
    let node = this.#root;
    for (const character of value) {
      while (node !== this.#root && !node.children.has(character)) {
        node = node.failure ?? this.#root;
      }
      node = node.children.get(character) ?? this.#root;
      AhoCorasickMatcher.addIds(results, node.ids);
    }
    const result = [...results];
    return result;
  }

  private static addIds(target: Set<string>, ids: readonly string[]): void {
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index];
      if (id !== undefined) {
        target.add(id);
      }
    }
  }

  private buildFailureLinks(): void {
    const queue: AhoCorasickNode[] = [];
    for (const child of this.#root.children.values()) {
      child.failure = this.#root;
      queue.push(child);
    }
    for (let index = 0; index < queue.length; index += 1) {
      const node = queue[index];
      if (node === undefined) {
        continue;
      }
      for (const [character, child] of node.children) {
        let failure = node.failure;
        while (failure !== undefined && failure !== this.#root && !failure.children.has(character)) {
          failure = failure.failure;
        }
        const fallback = failure?.children.get(character);
        child.failure = fallback === undefined || fallback === child ? this.#root : fallback;
        for (let idIndex = 0; idIndex < child.failure.ids.length; idIndex += 1) {
          const id = child.failure.ids[idIndex];
          if (id !== undefined) {
            child.ids.push(id);
          }
        }
        queue.push(child);
      }
    }
  }

  private insert(pattern: string, id: string): void {
    if (!Predicates.isString(pattern) || !Predicates.isString(id)) {
      throw new TypeError('AhoCorasickMatcher patterns and identifiers must be strings.');
    }
    if (pattern.length === 0) {
      return;
    }
    let node = this.#root;
    for (const character of pattern) {
      const child = node.children.get(character);
      if (child !== undefined) {
        node = child;
        continue;
      }
      const created = new AhoCorasickNode();
      node.children.set(character, created);
      node = created;
    }
    node.ids.push(id);
  }
}

class AhoCorasickNode {
  readonly 'children' = new Map<string, AhoCorasickNode>();
  'failure': AhoCorasickNode | undefined = undefined;
  readonly 'ids': string[] = [];
}
