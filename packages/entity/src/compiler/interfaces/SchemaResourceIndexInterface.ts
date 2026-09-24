import type { SchemaResourceInterface } from './SchemaResourceInterface.js';

/** Every schema resource (root, nested `$id`, registered remote) reachable in one compile, keyed by absolute base URI. */
export interface SchemaResourceIndexInterface {
  /** Keyed by `${baseUri}#${anchorName}`, value is the absolute JSON Pointer within that resource's document. Covers both `$anchor` and `$dynamicAnchor` — a `$dynamicAnchor` is also a valid static `$ref` target. */
  readonly 'anchors': ReadonlyMap<string, string>;
  /** Same keying, `$dynamicAnchor` only — the set a schema resource bookends onto the dynamic scope when entered. */
  readonly 'dynamicAnchors': ReadonlyMap<string, string>;
  readonly 'resources': ReadonlyMap<string, SchemaResourceInterface>;
}
