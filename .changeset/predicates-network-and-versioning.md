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
