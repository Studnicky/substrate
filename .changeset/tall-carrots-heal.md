---
"@studnicky/eslint-config": patch
---

`descriptive-identifiers`'s camelCase tokenizer no longer uses a backtracking regex (`/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g`), fixing a polynomial-time ReDoS (CodeQL `js/polynomial-redos`, high severity) on an uppercase run immediately followed by a non-letter character that isn't the end of the identifier — e.g. a long run of capitals before a digit forced the engine to backtrack one character at a time at every starting position within the run. Replaced with a linear-time manual scan that produces identical tokens for real-world identifiers and, as a side effect, fixes a latent bug where the old regex silently dropped acronym tokens entirely in that same shape (e.g. `HTTP2Client` tokenized as `["Client"]`, losing `HTTP2`).
