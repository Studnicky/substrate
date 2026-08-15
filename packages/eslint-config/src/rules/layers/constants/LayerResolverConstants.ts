/** Data constants for `LayerResolver`: the default allow-matrix for the canonical 5-layer hexagonal architecture, the path-segment splitter, and the bounded LRU cache over normalized path segments. */

// Default allow-matrix for the canonical 5-layer hexagonal architecture.
// 'infrastructure' is resolved dynamically against options.layers (it may import any configured layer).
// A Map (not a Record) so lookups go through `.get(...)` rather than a dynamic
// (computed) property access, which breaks V8 hidden-class optimization.
export const DEFAULT_STATIC_ALLOWED_IMPORTS = new Map<string, readonly string[]>([
  ['adapters', ['domain', 'ports', 'adapters']],
  ['application', ['domain', 'ports', 'application']],
  ['domain', ['domain']],
  ['ports', ['domain', 'ports']]
]);

export const PATH_SEPARATOR_PATTERN = /[\\/]+/u;

// Bounded LRU over a plain Map: Map iteration order is insertion order, so a
// delete+set on read moves an entry to MRU and `keys().next()` is always the
// LRU entry. This is a rule-internal cache (not a public API), so a bespoke
// bound is simpler and lighter than pulling in @studnicky/cache's LruCache —
// that package layers TTL/staleness/lifecycle-hook features (and its own
// dependency on @studnicky/json's schema validation) that this cache, which
// never expires entries and just needs a capacity ceiling, has no use for.
export const NORMALIZE_CACHE_CAPACITY = 5000;

export const NORMALIZE_CACHE = new Map<string, readonly string[]>();
