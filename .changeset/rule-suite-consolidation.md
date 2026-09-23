---
"@studnicky/eslint-config": major
---

Restructures the four flat rule suites (`entitySuite`, `hexagonalSuite`, `hygieneSuite`, `v8Suite`) into nine suites organized by concern: `entityModelSuite`, `moduleDesignSuite`, `diagnosticsSuite`, `VocabularySuite`, `classMechanicsSuite`, `LayerBoundarySuite`, `v8ObjectShapeSuite`, `v8CollectionTraversalSuite`, and `v8RepeatedWorkSuite`. `folder-content-shape` is renamed `entity-file-shape`; `interface-suffix` is absorbed into `interface-must-be-contract`; `whole-canonical-types` is absorbed into `type-alias-invariants`; `single-export` and `canonical-export-names` merge into `export-shape`. Every messageId these five ids reported remains reachable under its new rule id. Registered rule count is 53 (26 base + 27 v8), down from 56.
