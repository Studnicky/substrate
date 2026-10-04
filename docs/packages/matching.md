---
title: "@studnicky/matching"
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

## What it is

`@studnicky/matching` is a set of deterministic text, candidate-selection, and semantic-boundary primitives. It provides small pieces that can be composed into a catalogue search or review flow; it does not provide a search product, ranking policy, provider, or workflow.

## What it is for

Northstar Books uses these primitives when it needs reproducible catalogue matching: normalize a reader’s query, materialize plausible book records, score a pair of titles or identifiers, or define the contract around an embedding, reranking, classification, or adjudication provider. Browser and Node entrypoints expose the same runtime-safe primitives; semantic entities and interfaces define validated inputs and provider contracts rather than another application layer.

## Northstar Books examples

- **Normalize, retrieve candidates, and score similar text** solves the “reader typed a title imperfectly” problem. It normalizes the submitted title, finds plausible catalogue records, and produces deterministic score evidence that Northstar can use in its own ranking decision.
- **Validate a provider classification at the boundary** solves the “a supplier or AI service labelled an incoming book record” problem. It validates the received classification before Northstar’s inventory workflow consumes it, proving that provider output enters the application through a defined contract.
- **Compose a vectorizer with a local vector index** solves the “find conceptually related books” problem. It connects a vectorizer and index through the public contracts, proving that Northstar can choose its own embedding provider and storage while retaining a portable search boundary.

## Public entrypoints

| Import path                               | Use it when                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@studnicky/matching/node`                | Northstar runs deterministic candidate, encoding, extraction, matcher, normalization, and scoring primitives in its Node catalogue service.            |
| `@studnicky/matching/browser`             | Northstar runs the same browser-safe primitives in a reader-facing catalogue experience.                                                               |
| `@studnicky/matching/candidate-sources`   | Northstar materializes a bounded set of plausible book identifiers before applying its chosen score or ranking policy.                                 |
| `@studnicky/matching/encoders`            | Northstar derives phonetic, sparse, or set-similarity representations for titles, authors, and ISBN-adjacent search terms.                             |
| `@studnicky/matching/extractors`          | Northstar extracts tokens or character n-grams from catalogue text before matching it.                                                                 |
| `@studnicky/matching/matchers`            | Northstar tests title, collection, or shelving strings against exact, structural, prefix, suffix, or glob patterns.                                    |
| `@studnicky/matching/normalizers`         | Northstar canonicalizes a reader query or imported catalogue field at the intake boundary before comparison.                                           |
| `@studnicky/matching/scorers`             | Northstar selects a deterministic similarity measure and receives score evidence for a candidate pair.                                                 |
| `@studnicky/matching/interfaces`          | Northstar types its own candidate set, selection, and match-evidence implementations without coupling to a product implementation.                     |
| `@studnicky/matching/semantic/node`       | Northstar composes provider-neutral semantic contracts with Node-side provider or index adapters.                                                      |
| `@studnicky/matching/semantic/browser`    | Northstar composes browser-safe semantic contracts where the reader experience needs them.                                                             |
| `@studnicky/matching/semantic/entities`   | Northstar validates vector, reranking, classification, and adjudication inputs at the boundary before consuming provider data.                         |
| `@studnicky/matching/semantic/interfaces` | Northstar implements or injects vectorizer, vector-index, reranker, classifier, and adjudicator contracts without selecting a provider in the package. |

## Exports

| Symbol                      | Purpose                                                                                                                                 | Import path                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `BloomCandidateFilter`      | Probabilistic membership prefilter with false-positive evidence.                                                                        | `@studnicky/matching/node`                |
| `CandidateSetInterface`     | Defines a materialized candidate identifier set.                                                                                        | `@studnicky/matching/interfaces`          |
| `CuckooCandidateFilter`     | Deletable probabilistic membership prefilter.                                                                                           | `@studnicky/matching/node`                |
| `LshCandidateIndex`         | Locality-sensitive candidate materialization index.                                                                                     | `@studnicky/matching/node`                |
| `NgramCandidateIndex`       | Candidate index keyed by character n-grams.                                                                                             | `@studnicky/matching/node`                |
| `DoubleMetaphoneEncoder`    | Primary and alternate phonetic encoding.                                                                                                | `@studnicky/matching/node`                |
| `MetaphoneEncoder`          | Deterministic phonetic encoding.                                                                                                        | `@studnicky/matching/node`                |
| `MinimumHashEncoder`        | Fixed-seed approximate set-similarity signature.                                                                                        | `@studnicky/matching/node`                |
| `MatchEvidenceInterface`    | Defines deterministic match evidence for a candidate.                                                                                   | `@studnicky/matching/interfaces`          |
| `SoundexEncoder`            | English phonetic encoding.                                                                                                              | `@studnicky/matching/node`                |
| `TfIdfEncoder`              | Sparse TF-IDF vector encoder.                                                                                                           | `@studnicky/matching/node`                |
| `NgramExtractor`            | Character n-gram extraction.                                                                                                            | `@studnicky/matching/node`                |
| `TokenExtractor`            | Token extraction.                                                                                                                       | `@studnicky/matching/node`                |
| `AhoCorasickMatcher`        | Literal substring matching with an Aho–Corasick automaton.                                                                              | `@studnicky/matching/node`                |
| `ExactMatcher`              | Exact value matching.                                                                                                                   | `@studnicky/matching/node`                |
| `GlobMatcher`               | Glob pattern matching.                                                                                                                  | `@studnicky/matching/node`                |
| `RadixMatcher`              | Prefix-compressed structural pattern matching.                                                                                          | `@studnicky/matching/node`                |
| `SuffixMatcher`             | Boyer–Moore-style suffix matching.                                                                                                      | `@studnicky/matching/node`                |
| `TreeMatcher`               | Hierarchical structural matching.                                                                                                       | `@studnicky/matching/node`                |
| `TrieMatcher`               | Segment-trie structural matching.                                                                                                       | `@studnicky/matching/node`                |
| `StringNormalizer`          | Boundary string canonicalization.                                                                                                       | `@studnicky/matching/node`                |
| `CosineScorer`              | Sparse-vector cosine similarity.                                                                                                        | `@studnicky/matching/node`                |
| `DamerauLevenshteinScorer`  | Transposition-aware edit-distance similarity.                                                                                           | `@studnicky/matching/node`                |
| `JaccardScorer`             | Set overlap similarity.                                                                                                                 | `@studnicky/matching/node`                |
| `JaroScorer`                | Short-string similarity.                                                                                                                | `@studnicky/matching/node`                |
| `JaroWinklerScorer`         | Prefix-weighted short-string similarity.                                                                                                | `@studnicky/matching/node`                |
| `LevenshteinScorer`         | Edit-distance similarity.                                                                                                               | `@studnicky/matching/node`                |
| `NgramScorer`               | Character n-gram similarity.                                                                                                            | `@studnicky/matching/node`                |
| `SorensenDiceScorer`        | Set overlap similarity.                                                                                                                 | `@studnicky/matching/node`                |
| `MatchingAllocationError`   | Thrown when a scorer cannot allocate working memory for an input pair; the platform error is the `cause` (`matching.allocationFailed`). | `@studnicky/matching/node`                |
| `ScoreEvidenceInterface`    | Defines a score and its deterministic evidence.                                                                                         | `@studnicky/matching/interfaces`          |
| `SelectionInterface`        | Defines a selected candidate and score.                                                                                                 | `@studnicky/matching/interfaces`          |
| `AdjudicationEntity`        | Validates an adjudication confidence result.                                                                                            | `@studnicky/matching/semantic/entities`   |
| `AdjudicationInputEntity`   | Validates content and candidate identifiers for adjudication.                                                                           | `@studnicky/matching/semantic/entities`   |
| `ClassificationEntity`      | Validates a classification label and confidence.                                                                                        | `@studnicky/matching/semantic/entities`   |
| `ClassificationInputEntity` | Validates classification content and optional labels.                                                                                   | `@studnicky/matching/semantic/entities`   |
| `RerankInputEntity`         | Validates content and candidate identifiers for reranking.                                                                              | `@studnicky/matching/semantic/entities`   |
| `RerankMatchEntity`         | Validates a reranked identifier and score.                                                                                              | `@studnicky/matching/semantic/entities`   |
| `VectorEntryDataEntity`     | Validates a vector entry identifier and namespace.                                                                                      | `@studnicky/matching/semantic/entities`   |
| `VectorMatchEntity`         | Validates a vector-search identifier and score.                                                                                         | `@studnicky/matching/semantic/entities`   |
| `VectorSearchOptionsEntity` | Validates vector-search namespace and limit.                                                                                            | `@studnicky/matching/semantic/entities`   |
| `VectorizationInputEntity`  | Validates content and metadata before embedding.                                                                                        | `@studnicky/matching/semantic/entities`   |
| `AdjudicatorInterface`      | Defines asynchronous provider-neutral adjudication.                                                                                     | `@studnicky/matching/semantic/interfaces` |
| `ClassifierInterface`       | Defines asynchronous provider-neutral classification.                                                                                   | `@studnicky/matching/semantic/interfaces` |
| `RerankerInterface`         | Defines asynchronous provider-neutral reranking.                                                                                        | `@studnicky/matching/semantic/interfaces` |
| `VectorEntryInterface`      | Defines a vector payload with canonical entry data.                                                                                     | `@studnicky/matching/semantic/interfaces` |
| `VectorIndexInterface`      | Defines asynchronous vector index storage and search.                                                                                   | `@studnicky/matching/semantic/interfaces` |
| `VectorizerInterface`       | Defines asynchronous embedding production.                                                                                              | `@studnicky/matching/semantic/interfaces` |

Each category is also available from its named subpath: `candidate-sources`, `encoders`, `extractors`, `matchers`, `normalizers`, and `scorers`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/matching)
