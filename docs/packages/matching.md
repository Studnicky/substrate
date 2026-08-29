---
title: '@studnicky/matching'
description: Deterministic matching, scoring, encoding, extraction, and candidate-source primitives.
---

# @studnicky/matching

`@studnicky/matching` supplies independent deterministic tools. A caller chooses whether to normalize text, create a candidate pool, score a candidate pair, or test a structural pattern; the package does not turn those choices into a prescribed pipeline.

`GlobMatcher` supports standard `*`, `**`, `?`, character-class, and brace-alternative glob syntax through a browser-compatible implementation. `TrieMatcher` compiles one segment pattern for repeated evaluation, while `TreeMatcher` and the candidate-index classes own mutable registration and candidate materialization.

## Install

```bash
pnpm add @studnicky/matching
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BloomCandidateFilter` | Probabilistic membership prefilter with false-positive evidence. | `@studnicky/matching` |
| `CandidateSetInterface` | Defines a materialized candidate identifier set. | `@studnicky/matching` |
| `CuckooCandidateFilter` | Deletable probabilistic membership prefilter. | `@studnicky/matching` |
| `LshCandidateIndex` | Locality-sensitive candidate materialization index. | `@studnicky/matching` |
| `NgramCandidateIndex` | Candidate index keyed by character n-grams. | `@studnicky/matching` |
| `DoubleMetaphoneEncoder` | Primary and alternate phonetic encoding. | `@studnicky/matching` |
| `MetaphoneEncoder` | Deterministic phonetic encoding. | `@studnicky/matching` |
| `MinimumHashEncoder` | Fixed-seed approximate set-similarity signature. | `@studnicky/matching` |
| `MatchEvidenceInterface` | Defines deterministic match evidence for a candidate. | `@studnicky/matching` |
| `SoundexEncoder` | English phonetic encoding. | `@studnicky/matching` |
| `TfIdfEncoder` | Sparse TF-IDF vector encoder. | `@studnicky/matching` |
| `NgramExtractor` | Character n-gram extraction. | `@studnicky/matching` |
| `TokenExtractor` | Token extraction. | `@studnicky/matching` |
| `AhoCorasickMatcher` | Literal substring matching with an Aho–Corasick automaton. | `@studnicky/matching` |
| `ExactMatcher` | Exact value matching. | `@studnicky/matching` |
| `GlobMatcher` | Glob pattern matching. | `@studnicky/matching` |
| `RadixMatcher` | Prefix-compressed structural pattern matching. | `@studnicky/matching` |
| `SuffixMatcher` | Boyer–Moore-style suffix matching. | `@studnicky/matching` |
| `TreeMatcher` | Hierarchical structural matching. | `@studnicky/matching` |
| `TrieMatcher` | Segment-trie structural matching. | `@studnicky/matching` |
| `StringNormalizer` | Boundary string canonicalization. | `@studnicky/matching` |
| `CosineScorer` | Sparse-vector cosine similarity. | `@studnicky/matching` |
| `DamerauLevenshteinScorer` | Transposition-aware edit-distance similarity. | `@studnicky/matching` |
| `JaccardScorer` | Set overlap similarity. | `@studnicky/matching` |
| `JaroScorer` | Short-string similarity. | `@studnicky/matching` |
| `JaroWinklerScorer` | Prefix-weighted short-string similarity. | `@studnicky/matching` |
| `LevenshteinScorer` | Edit-distance similarity. | `@studnicky/matching` |
| `NgramScorer` | Character n-gram similarity. | `@studnicky/matching` |
| `SorensenDiceScorer` | Set overlap similarity. | `@studnicky/matching` |
| `ScoreEvidenceInterface` | Defines a score and its deterministic evidence. | `@studnicky/matching` |
| `SelectionInterface` | Defines a selected candidate and score. | `@studnicky/matching` |

Each category is also available from its named subpath: `candidate-sources`, `encoders`, `extractors`, `matchers`, `normalizers`, and `scorers`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching)
