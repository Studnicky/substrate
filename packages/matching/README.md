# @studnicky/matching

> Deterministic normalizers, encoders, extractors, matchers, scorers, and candidate sources.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/matching)

`@studnicky/matching` exposes independently composable, model-free primitives. It does not choose candidates, apply a threshold, or deliver an event: a consumer combines the primitive that fits its own selection policy with `@studnicky/topic-router`, `@studnicky/types/filters`, or application code.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/matching
```

## Usage

```ts
import { GlobMatcher, JaccardScorer, NgramCandidateIndex, StringNormalizer } from '@studnicky/matching';

const topic = StringNormalizer.normalize(' API.V1.Users ');
const patternMatches = GlobMatcher.matches('api.**', topic);

const candidates = new NgramCandidateIndex(3);
candidates.register('audit', 'api.audit');
const candidateIds = candidates.candidates(topic);

const overlap = JaccardScorer.score(
  new Set(['api', 'users']),
  new Set(['api', 'audit'])
);
```

`GlobMatcher` supports `*`, `**`, `?`, character classes, brace alternatives, and the browser-compatible glob implementation. `TrieMatcher` compiles one segment pattern for repeated matching; `TreeMatcher`, `RadixMatcher`, `NgramCandidateIndex`, and `LshCandidateIndex` own mutable registration and candidate materialization. Bloom and Cuckoo filters provide negative prefilter evidence only: a positive result never selects or delivers by itself.

Every non-structural operation remains independent. A consumer can use a phonetic encoder as a blocking key, a scorer as evidence, an index to narrow IDs, or none of them.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/matching

## License

MIT
