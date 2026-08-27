---
'@studnicky/types': minor
---

Adds `Predicates.isIpInCidr`, `Predicates.ipv4ToUint32`, `Predicates.parseCidrRange`,
`Predicates.satisfiesSemverRange`, `Predicates.compareSemverVersions`, and
`Predicates.asStrictNumber`, generalizing value-matching logic that `@studnicky/drilldown`
and the filters module both need. `Predicates.performRangeComparison` gains an options
object with `caseSensitive` (for its string branch) and `boundary: 'closed' | 'half-open'`
(for its numeric/date branches) — both default to the prior behavior, so every existing
call site is unaffected.

Extracted while auditing `@studnicky/drilldown`'s matcher vocabulary against the filters
module's operator vocabulary for shared concepts: CIDR/IP matching and semver range
satisfaction existed nowhere in `@studnicky/types` or filters before this; alphabetic
range matching and half-open numeric/date ranges were near-duplicates of existing
`performRangeComparison` behavior, now unified.

An adversarial review of this same unreleased branch caught and fixed several edge cases
before anything shipped: `^0.0.x` now locks the patch version (not just minor), a bare
`~1` range now matches any `1.x.x` (not just `1.0.x`), build metadata (`+build.1`) no
longer breaks parsing, IP/CIDR segments with trailing non-digit garbage (e.g. `10.0.0.1x`)
are now rejected instead of silently truncated, and prerelease precedence now compares
dot-separated identifiers per the semver spec (numeric-aware, not a flat string sort) —
these are all bug fixes to methods that only landed in this same unreleased branch, not
changes to a previously-shipped API.
