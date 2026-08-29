import { Predicates } from '@studnicky/types';

export class RadixMatcher {
  readonly #registrations = new Map<string, string>();
  readonly #root = new RadixMatcherNode('');

  static matches(pattern: string, topic: string, delimiter = '.'): boolean {
    RadixMatcher.assertInput(pattern, 'pattern');
    RadixMatcher.assertInput(topic, 'topic');
    RadixMatcher.assertInput(delimiter, 'delimiter');
    const suffix = `${delimiter}*`;
    if (!pattern.endsWith(suffix)) {
      return false;
    }
    const prefix = pattern.slice(0, -1);
    const remaining = topic.slice(prefix.length);
    const result = topic.startsWith(prefix) && remaining.length > 0 && !remaining.includes(delimiter);
    return result;
  }

  candidates(topic: string, delimiter = '.'): readonly string[] {
    RadixMatcher.assertInput(topic, 'topic');
    RadixMatcher.assertInput(delimiter, 'delimiter');
    const ids = new Set<string>();
    let node = this.#root;
    let position = 0;
    while (position < topic.length) {
      const child = node.childAt(topic, position);
      if (child === undefined) {
        break;
      }
      position += child.fragment.length;
      const remaining = topic.slice(position);
      if (remaining.length > 0 && !remaining.includes(delimiter)) {
        RadixMatcher.addIds(ids, child.ids);
      }
      node = child;
    }
    const result = [...ids];
    return result;
  }

  register(id: string, pattern: string, delimiter = '.'): void {
    RadixMatcher.assertInput(id, 'id');
    RadixMatcher.assertInput(pattern, 'pattern');
    RadixMatcher.assertInput(delimiter, 'delimiter');
    const suffix = `${delimiter}*`;
    if (!pattern.endsWith(suffix)) {
      throw new TypeError('RadixMatcher patterns must end with a single-segment wildcard.');
    }
    const prefix = pattern.slice(0, -1);
    this.unregister(id);
    this.#root.insert(prefix, id);
    this.#registrations.set(id, prefix);
  }

  unregister(id: string): boolean {
    const prefix = this.#registrations.get(id);
    if (prefix === undefined) {
      return false;
    }
    const node = this.#root.find(prefix);
    if (node === undefined) {
      return false;
    }
    node.ids.delete(id);
    this.#registrations.delete(id);
    return true;
  }

  private static addIds(target: Set<string>, ids: ReadonlySet<string>): void {
    for (const id of ids) {
      target.add(id);
    }
  }

  private static assertInput(value: string, label: string): void {
    if (!Predicates.isString(value) || value.length === 0) {
      throw new TypeError(`RadixMatcher ${label} must be a non-empty string.`);
    }
  }
}

class RadixMatcherNode {
  readonly 'children' = new Map<string, RadixMatcherNode>();
  readonly 'ids' = new Set<string>();
  'fragment': string;

  constructor(fragment: string) {
    this.fragment = fragment;
  }

  childAt(value: string, position: number): RadixMatcherNode | undefined {
    for (const child of this.children.values()) {
      if (value.startsWith(child.fragment, position)) {
        return child;
      }
    }
    return undefined;
  }

  find(value: string): RadixMatcherNode | undefined {
    if (value.length === 0) {
      return this;
    }
    const child = this.childAt(value, 0);
    if (child === undefined) {
      return undefined;
    }
    const result = child.find(value.slice(child.fragment.length));
    return result;
  }

  insert(value: string, id: string): void {
    if (value.length === 0) {
      this.ids.add(id);
      return;
    }
    for (const child of this.children.values()) {
      const sharedLength = RadixMatcherNode.sharedPrefixLength(value, child.fragment);
      if (sharedLength === 0) {
        continue;
      }
      if (sharedLength === child.fragment.length) {
        child.insert(value.slice(sharedLength), id);
        return;
      }
      this.split(child, value, id, sharedLength);
      return;
    }
    const created = new RadixMatcherNode(value);
    created.ids.add(id);
    this.children.set(value, created);
  }

  private static sharedPrefixLength(left: string, right: string): number {
    const limit = Math.min(left.length, right.length);
    let index = 0;
    while (index < limit && left[index] === right[index]) {
      index += 1;
    }
    return index;
  }

  private split(child: RadixMatcherNode, value: string, id: string, sharedLength: number): void {
    this.children.delete(child.fragment);
    const common = child.fragment.slice(0, sharedLength);
    const intermediate = new RadixMatcherNode(common);
    child.fragment = child.fragment.slice(sharedLength);
    intermediate.children.set(child.fragment, child);
    const remainder = value.slice(sharedLength);
    if (remainder.length === 0) {
      intermediate.ids.add(id);
    } else {
      const created = new RadixMatcherNode(remainder);
      created.ids.add(id);
      intermediate.children.set(remainder, created);
    }
    this.children.set(common, intermediate);
  }
}
