---
title: '@studnicky/matching'
description: Deterministic matching, scoring, encoding, extraction, and candidate-source primitives.
---

# @studnicky/matching

`@studnicky/matching` supplies independent deterministic tools. A caller chooses whether to normalize text, create a candidate pool, score a candidate pair, or test a structural pattern; the package does not turn those choices into a prescribed pipeline.

`GlobMatcher` supports standard `*`, `**`, `?`, character-class, and brace-alternative glob syntax through a browser-compatible implementation. `TrieMatcher` compiles one segment pattern for repeated evaluation, while `TreeMatcher` and the candidate-index classes own mutable registration and candidate materialization.

The `semantic` subpaths define provider-neutral vectorization, vector-index, reranking, classification, and adjudication contracts. They own JSON intake models and asynchronous boundary contracts only; callers supply their own provider, model, index, ranking policy, and orchestration.

## Northstar Books catalogue matching

A reader who searches for a title by a misspelled name, partial ISBN, or alternate spelling still needs a catalogue result that the server can explain and reproduce. Northstar normalizes the query, materializes candidates, then chooses its scoring policy with these primitives. The package guarantees deterministic normalization, candidate materialization, matching, and score evidence; the application retains control of thresholds, ranking policy, and the surrounding search workflow.

## Install

```bash
pnpm add @studnicky/matching
```

## Try it

Normalize a user query, retrieve likely candidates from an n-gram index, and rank them with deterministic edit-distance scoring.

<RunnableExample src="packages/matching/examples/findSimilarText" title="Normalize, retrieve candidates, and score similar text" />

<RunnableExample src="packages/matching/examples/validateClassification" title="Validate a provider classification at the boundary" />

<RunnableExample src="packages/matching/examples/vectorSearchContract" title="Compose a vectorizer with a local vector index" />

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
| `MatchingAllocationError` | Thrown when a scorer cannot allocate working memory for an input pair; the platform error is the `cause` (`matching.allocationFailed`). | `@studnicky/matching/node` |
| `ScoreEvidenceInterface` | Defines a score and its deterministic evidence. | `@studnicky/matching/interfaces` |
| `SelectionInterface` | Defines a selected candidate and score. | `@studnicky/matching/interfaces` |
| `AdjudicationEntity` | Validates an adjudication confidence result. | `@studnicky/matching/semantic/entities` |
| `AdjudicationInputEntity` | Validates content and candidate identifiers for adjudication. | `@studnicky/matching/semantic/entities` |
| `ClassificationEntity` | Validates a classification label and confidence. | `@studnicky/matching/semantic/entities` |
| `ClassificationInputEntity` | Validates classification content and optional labels. | `@studnicky/matching/semantic/entities` |
| `RerankInputEntity` | Validates content and candidate identifiers for reranking. | `@studnicky/matching/semantic/entities` |
| `RerankMatchEntity` | Validates a reranked identifier and score. | `@studnicky/matching/semantic/entities` |
| `VectorEntryDataEntity` | Validates a vector entry identifier and namespace. | `@studnicky/matching/semantic/entities` |
| `VectorMatchEntity` | Validates a vector-search identifier and score. | `@studnicky/matching/semantic/entities` |
| `VectorSearchOptionsEntity` | Validates vector-search namespace and limit. | `@studnicky/matching/semantic/entities` |
| `VectorizationInputEntity` | Validates content and metadata before embedding. | `@studnicky/matching/semantic/entities` |
| `AdjudicatorInterface` | Defines asynchronous provider-neutral adjudication. | `@studnicky/matching/semantic/interfaces` |
| `ClassifierInterface` | Defines asynchronous provider-neutral classification. | `@studnicky/matching/semantic/interfaces` |
| `RerankerInterface` | Defines asynchronous provider-neutral reranking. | `@studnicky/matching/semantic/interfaces` |
| `VectorEntryInterface` | Defines a vector payload with canonical entry data. | `@studnicky/matching/semantic/interfaces` |
| `VectorIndexInterface` | Defines asynchronous vector index storage and search. | `@studnicky/matching/semantic/interfaces` |
| `VectorizerInterface` | Defines asynchronous embedding production. | `@studnicky/matching/semantic/interfaces` |

Each category is also available from its named subpath: `candidate-sources`, `encoders`, `extractors`, `matchers`, `normalizers`, and `scorers`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching)
