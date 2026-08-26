/** Data constants for `LayerResolver`: the default allow-matrix for the canonical 5-layer hexagonal architecture, the path-segment splitter, and the bounded LRU cache over normalized path segments. */

// Default allow-matrix for the canonical 5-layer hexagonal architecture, expressed by POSITION in
// `options.layers` rather than by literal layer name.
//
// `LayerOptionsEntity.Schema` documents `layers` itself as an "Ordered list of enforced layer
// names, e.g. [\"domain\", \"ports\", \"application\", \"adapters\", \"infrastructure\"]" — the
// ORDER is the contract, not the spelling. `domainPurity.ts`'s `domainLayerName` option (default
// `'domain'`) already lets a consumer rename that one layer; a consumer renaming ALL of them (the
// Atomic Design taxonomy under discussion for H4, e.g. `['atoms', 'molecules', 'organisms',
// 'templates', 'pages']`) is the same supported pattern applied to every position.
//
// A prior revision of this matrix was a `Map<string, readonly string[]>` keyed by the literal
// names 'adapters' / 'application' / 'domain' / 'ports', with `'infrastructure'` special-cased by
// literal string equality in `DefaultAllowedImports.get`. Renaming ANY layer made every one of
// those lookups miss, and `canImport` treats a missing default as `allowed === undefined ->
// false` — so a full rename silently flipped the default allow-matrix to deny-all (every
// cross-layer import denied, same-layer imports still allowed via `canImport`'s own
// `sourceLayer === targetLayer` shortcut). UNPROVEN by an end-to-end `npx eslint` probe: the four
// `arch/*` rules that ultimately call `LayerResolver.canImport` are not enabled in
// `eslint.config.mjs` yet (see C3-C6 in the eslint-config objectives). PROVEN instead with a
// direct unit probe against `LayerResolver.canImport` itself
// (`tests/unit/layers/LayerResolver.scenarios.json`, cases prefixed "D7:"): passing a `layers`
// array with every position renamed, `canImport('organisms', 'atoms', ...)` (application-role ->
// domain-role) returned `false` against this matrix pre-fix, though the matrix's own domain
// position is `[0]` and application's allowed set includes `0` — the literal-name lookup for
// `'organisms'` simply missed the Map entirely.
//
// Position 0: domain        — may import only itself.
// Position 1: ports         — may import domain, ports.
// Position 2: application   — may import domain, ports, application.
// Position 3: adapters      — may import domain, ports, adapters.
// Position 4 (`INFRASTRUCTURE_POSITION`), when present, is resolved dynamically in
// `DefaultAllowedImports` against the actual `options.layers` length — it may import every
// configured layer, same behavior as before this change, just keyed by position instead of the
// literal name `'infrastructure'`.
//
// An array of readonly-number-arrays (not a Map) because the key IS the position — no lookup
// beyond a direct index read, so there is no dynamic-property-access hazard to route around here.
export const CANONICAL_ROLE_ALLOWED_POSITIONS: readonly (readonly number[])[] = [
  [0],
  [
    0,
    1
  ],
  [
    0,
    1,
    2
  ],
  [
    0,
    1,
    3
  ]
];

export const INFRASTRUCTURE_POSITION = 4;

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
