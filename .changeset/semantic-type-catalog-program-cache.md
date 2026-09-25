---
"@studnicky/eslint-config": patch
---

`@studnicky/no-redefined-external-types` no longer rebuilds `SemanticTypeCatalog`'s dependency and entity candidates on every linted file's `Program:exit`. Those candidates depend only on the linted file's package root, never on the file itself, so they are cached once per `(ts.Program, packageRoot)`. Platform candidates stay uncached — `checker.getSymbolsInScope` is genuinely file-scoped. Measured on a 150-file, one-process lint: the rule's share of total rule-execution time drops from 23287ms (81.4%) to roughly 2400ms, an ~89.6% reduction, with byte-identical findings before and after.
