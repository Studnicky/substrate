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

## Try it

Normalize a user query, retrieve likely candidates from an n-gram index, and rank them with deterministic edit-distance scoring.

<RunnableExample src="packages/matching/examples/findSimilarText" title="Normalize, retrieve candidates, and score similar text" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BloomCandidateFilter` | Probabilistic membership prefilter with false-positive evidence. | `@studnicky/matching/node` |
| `CandidateSetInterface` | Defines a materialized candidate identifier set. | `@studnicky/matching/interfaces` |
| `CuckooCandidateFilter` | Deletable probabilistic membership prefilter. | `@studnicky/matching/node` |
| `LshCandidateIndex` | Locality-sensitive candidate materialization index. | `@studnicky/matching/node` |
| `NgramCandidateIndex` | Candidate index keyed by character n-grams. | `@studnicky/matching/node` |
| `DoubleMetaphoneEncoder` | Primary and alternate phonetic encoding. | `@studnicky/matching/node` |
| `MetaphoneEncoder` | Deterministic phonetic encoding. | `@studnicky/matching/node` |
| `MinimumHashEncoder` | Fixed-seed approximate set-similarity signature. | `@studnicky/matching/node` |
| `MatchEvidenceInterface` | Defines deterministic match evidence for a candidate. | `@studnicky/matching/interfaces` |
| `SoundexEncoder` | English phonetic encoding. | `@studnicky/matching/node` |
| `TfIdfEncoder` | Sparse TF-IDF vector encoder. | `@studnicky/matching/node` |
| `NgramExtractor` | Character n-gram extraction. | `@studnicky/matching/node` |
| `TokenExtractor` | Token extraction. | `@studnicky/matching/node` |
| `AhoCorasickMatcher` | Literal substring matching with an Aho–Corasick automaton. | `@studnicky/matching/node` |
| `ExactMatcher` | Exact value matching. | `@studnicky/matching/node` |
| `GlobMatcher` | Glob pattern matching. | `@studnicky/matching/node` |
| `RadixMatcher` | Prefix-compressed structural pattern matching. | `@studnicky/matching/node` |
| `SuffixMatcher` | Boyer–Moore-style suffix matching. | `@studnicky/matching/node` |
| `TreeMatcher` | Hierarchical structural matching. | `@studnicky/matching/node` |
| `TrieMatcher` | Segment-trie structural matching. | `@studnicky/matching/node` |
| `StringNormalizer` | Boundary string canonicalization. | `@studnicky/matching/node` |
| `CosineScorer` | Sparse-vector cosine similarity. | `@studnicky/matching/node` |
| `DamerauLevenshteinScorer` | Transposition-aware edit-distance similarity. | `@studnicky/matching/node` |
| `JaccardScorer` | Set overlap similarity. | `@studnicky/matching/node` |
| `JaroScorer` | Short-string similarity. | `@studnicky/matching/node` |
| `JaroWinklerScorer` | Prefix-weighted short-string similarity. | `@studnicky/matching/node` |
| `LevenshteinScorer` | Edit-distance similarity. | `@studnicky/matching/node` |
| `NgramScorer` | Character n-gram similarity. | `@studnicky/matching/node` |
| `SorensenDiceScorer` | Set overlap similarity. | `@studnicky/matching/node` |
| `ScoreEvidenceInterface` | Defines a score and its deterministic evidence. | `@studnicky/matching/interfaces` |
| `SelectionInterface` | Defines a selected candidate and score. | `@studnicky/matching/interfaces` |

Each category is also available from its named subpath: `candidate-sources`, `encoders`, `extractors`, `matchers`, `normalizers`, and `scorers`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching)
