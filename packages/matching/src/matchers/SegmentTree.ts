export class SegmentTree {
  readonly #registrations = new Map<string, readonly string[]>();
  readonly #root = new SegmentTreeNode();

  public candidates(segments: readonly string[]): readonly string[] {
    let current = this.expandDeepWildcards(new Set([this.#root]));
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) {
        continue;
      }
      const next = new Set<SegmentTreeNode>();
      for (const node of current) {
        const literal = node.literals.get(segment);
        if (literal !== undefined) {
          next.add(literal);
        }
        if (node.wildcard !== undefined) {
          next.add(node.wildcard);
        }
        if (node.isDeepWildcard) {
          next.add(node);
        }
      }
      current = this.expandDeepWildcards(next);
      if (current.size === 0) {
        return [];
      }
    }

    const ids = new Set<string>();
    const terminalNodes = this.expandDeepWildcards(current);
    for (const node of terminalNodes) {
      for (const id of node.ids) {
        ids.add(id);
      }
    }
    const result = [...ids];
    return result;
  }

  public register(id: string, segments: readonly string[]): void {
    this.unregister(id);
    let node = this.#root;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) {
        continue;
      }
      node = node.child(segment);
    }
    node.ids.add(id);
    this.#registrations.set(id, segments);
  }

  public unregister(id: string): boolean {
    const segments = this.#registrations.get(id);
    if (segments === undefined) {
      return false;
    }

    let node = this.#root;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) {
        return false;
      }
      const child = node.getChild(segment);
      if (child === undefined) {
        return false;
      }
      node = child;
    }
    node.ids.delete(id);
    this.#registrations.delete(id);
    return true;
  }

  private expandDeepWildcards(nodes: ReadonlySet<SegmentTreeNode>): Set<SegmentTreeNode> {
    const expanded = new Set(nodes);
    const pending = [...nodes];
    while (pending.length > 0) {
      const node = pending.pop();
      if (node?.deepWildcard === undefined || expanded.has(node.deepWildcard)) {
        continue;
      }
      expanded.add(node.deepWildcard);
      pending.push(node.deepWildcard);
    }
    return expanded;
  }
}

class SegmentTreeNode {
  public readonly 'ids' = new Set<string>();
  public readonly 'isDeepWildcard': boolean;
  public readonly 'literals' = new Map<string, SegmentTreeNode>();
  public 'deepWildcard': SegmentTreeNode | undefined = undefined;
  public 'wildcard': SegmentTreeNode | undefined = undefined;

  public constructor(isDeepWildcard = false) {
    this.isDeepWildcard = isDeepWildcard;
  }

  public child(segment: string): SegmentTreeNode {
    if (segment === '*') {
      this.wildcard ??= new SegmentTreeNode();
      return this.wildcard;
    }
    if (segment === '**') {
      this.deepWildcard ??= new SegmentTreeNode(true);
      return this.deepWildcard;
    }
    const existing = this.literals.get(segment);
    if (existing !== undefined) {
      return existing;
    }
    const created = new SegmentTreeNode();
    this.literals.set(segment, created);
    return created;
  }

  public getChild(segment: string): SegmentTreeNode | undefined {
    if (segment === '*') {
      return this.wildcard;
    }
    if (segment === '**') {
      return this.deepWildcard;
    }
    const result = this.literals.get(segment);
    return result;
  }
}
