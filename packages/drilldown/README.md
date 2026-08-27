# @studnicky/drilldown

Deterministic multi-level grouping, faceting, and sorting engine for arbitrary record data. Discovers filterable/groupable properties from your data instead of requiring hardcoded field names, and produces the same tree on every call given the same input.

## Installation

**GitHub Packages only — this is not published to the public npm registry.** `npm install @studnicky/drilldown` will fail with a 404 until you've done the setup below.

1. Scope `@studnicky` to GitHub Packages in your project's `.npmrc`:

   ```
   @studnicky:registry=https://npm.pkg.github.com
   ```

2. Authenticate — a GitHub personal access token with `read:packages` scope, exported as `NODE_AUTH_TOKEN` (or set directly in `~/.npmrc`):

   ```
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

3. Only then install:

   ```sh
   npm install @studnicky/drilldown
   ```

## Quick start

### Auto-grouping

Without explicit rules, `DrillDown` analyzes the data and picks a property order automatically:

```ts
import { DrillDown } from '@studnicky/drilldown';

const orders = [
  { category: 'alpha', region: 'east' },
  { category: 'alpha', region: 'west' },
  { category: 'beta', region: 'east' },
  { category: 'beta', region: 'east' },
  { category: 'gamma', region: 'west' }
];

const drilldown = new DrillDown();
const tree = drilldown.group(orders);
```

### Explicit rules

Declare exactly which property to group by at each depth, and which values map to which branches:

```ts
const tree = drilldown.group(orders, {
  minimumGroupSize: 0,
  rules: {
    group: [{
      property: 'category',
      values: [
        { match: 'alpha', type: 'string' },
        { match: 'beta', type: 'string' },
        { match: 'gamma', type: 'string' }
      ]
    }]
  }
});
```

`tree` is a `GroupNodeType`: each node has `value` (the group's key), `property` (which property produced it), `grouped` (child nodes, or `null` at a leaf), and `ungrouped` (leaf records).

### Inspecting groupable properties

`analyze()` runs the same discovery DrillDown uses internally, without building the tree — useful for building a "group by" picker:

```ts
const analysis = drilldown.analyze(orders);
analysis.recommendedGrouping; // property names ordered by suitability
analysis.selectedGrouping;    // the order DrillDown would actually use
```

### Faceted filtering

`facetOptions` and `resolveFilterState` support building a faceted-search UI — narrowing each dimension's available options based on the others' active selections:

```ts
import { FacetedDiscovery } from '@studnicky/drilldown';

const rows = [
  { color: 'red', size: 'S' },
  { color: 'red', size: 'M' },
  { color: 'blue', size: 'S' }
];
const dimensions = ['color', 'size'] as const;
const accessors = {
  color: (row) => row.color,
  size: (row) => row.size
};

FacetedDiscovery.facetOptions(rows, dimensions, { color: new Set(['red']) }, accessors, 'size');
// Set { 'S', 'M' } — sizes available given color=red

FacetedDiscovery.apply(rows, dimensions, { color: new Set(['blue']), size: new Set(['S']) }, accessors);
// rows matching every active dimension
```

### Validating a config from an external source

`DrillDownConfig.Schema` is a JSON Schema, and `ruleValidator` gives readable error paths for a config assembled from user input, an API payload, or an LLM:

```ts
import { DrillDownConfig, ruleValidator } from '@studnicky/drilldown';

const errors = ruleValidator.validate(config.rules);
if (errors.length > 0) {
  // errors are `path: message` strings
}
```

## API surface

- **`DrillDown`** — the grouping engine. `group(data, config?)` builds the tree; `analyze(data, config?)` reports discoverable/recommended properties; `facetOptions` / `resolveFilterState` delegate to `FacetedDiscovery`.
- **`DataAnalyzer`** — static analysis of a record set's groupable properties (type, cardinality, coverage, bounds).
- **`FacetedDiscovery`** — static faceted-filtering primitives (`facetOptions`, `apply`, `resolveFilterState`).
- **`DrillDownConfig`** — namespace exporting the JSON Schema (`Schema`) and derived TypeScript type for `DrillDownConfigType`.
- **`ruleValidator`** — validates a `DrilldownRulesType` tree and returns human-readable error strings.

Grouping config supports: explicit per-depth rules, auto-grouping (`count`- or `size`-targeted), value matchers (string, range, date, semver, CIDR, sequential, alphabetic), top-level and per-value filters, sort rules, `minimumGroupSize`/`maximumDepth`/`maximumNodes` bounds, and an outlier bucket (`groupOutliers`) for values that don't match any declared rule.

## License

MIT
