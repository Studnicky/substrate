---
"@studnicky/eslint-config": minor
---

The five `TypeContract*` classifier modules (`TypeContractAliasResolution`, `TypeContractCallabilityClassification`, `TypeContractDataNodeClassification`, `TypeContractInterfaceContractResolution`, `TypeContractInterfaceTypeResolution`) and `TypeContractContext` depend on new `*Interface` contract files (`TypeContractContextInterface`, `AliasResolutionInterface`, `CallabilityClassificationInterface`, `DataNodeClassificationInterface`, `InterfaceContractResolutionInterface`, `InterfaceTypeResolutionInterface`) instead of on each other's concrete classes. `TypeContractContext` and each classifier previously imported the other's class purely for a type annotation, forming five circular imports centred on `TypeContractContext`; each classifier now depends only on the interface describing what it actually calls, and `TypeContractContext` depends only on the interfaces describing the classifiers it wires together.
