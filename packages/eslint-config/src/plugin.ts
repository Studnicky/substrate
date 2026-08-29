import type { Rule } from 'eslint';

import { allTypesAreEntities } from './rules/allTypesAreEntities.js';
import { adapterOnlyImport } from './rules/arch/adapterOnlyImport.js';
import { domainPurity } from './rules/arch/domainPurity.js';
import { intakeParseOnly } from './rules/arch/intakeParseOnly.js';
import { knownTypesOutsideAdapters } from './rules/arch/knownTypesOutsideAdapters.js';
import { layerImportBoundary } from './rules/arch/layerImportBoundary.js';
import { lexicalThisOnly } from './rules/arch/lexicalThisOnly.js';
import { noThreadedVocabulary } from './rules/arch/noThreadedVocabulary.js';
import { noUnparsedAssertion } from './rules/arch/noUnparsedAssertion.js';
import { canonicalExportNames } from './rules/canonicalExportNames.js';
import { cleanDiagnostics } from './rules/cleanDiagnostics.js';
import { descriptiveIdentifiers } from './rules/descriptiveIdentifiers.js';
import { directInvocationOnly } from './rules/directInvocationOnly.js';
import { explicitReturnBinding } from './rules/explicitReturnBinding.js';
import { folderContentShape } from './rules/folderContentShape.js';
import { hashPrivateFields } from './rules/hashPrivateFields.js';
import { inlineTrivialLogic } from './rules/inlineTrivialLogic.js';
import { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
import { interfacesComposeNamedTypes } from './rules/interfacesComposeNamedTypes.js';
import { interfaceSuffix } from './rules/interfaceSuffix.js';
import { noFunctionRegistries } from './rules/noFunctionRegistries.js';
import { noMixedCallableShapes } from './rules/noMixedCallableShapes.js';
import { preferCollectionTypes } from './rules/preferCollectionTypes.js';
import { requireOptionsObject } from './rules/requireOptionsObject.js';
import { singleExport } from './rules/singleExport.js';
import { staticMethodVerbs } from './rules/staticMethodVerbs.js';
import { typeAliasInvariants } from './rules/typeAliasInvariants.js';
import { wholeCanonicalTypes } from './rules/wholeCanonicalTypes.js';

export const plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'adapter-only-import': adapterOnlyImport,
    'all-types-are-entities': allTypesAreEntities,
    'canonical-export-names': canonicalExportNames,
    'clean-diagnostics': cleanDiagnostics,
    'descriptive-identifiers': descriptiveIdentifiers,
    'direct-invocation-only': directInvocationOnly,
    'domain-purity': domainPurity,
    'explicit-return-binding': explicitReturnBinding,
    'folder-content-shape': folderContentShape,
    'hash-private-fields': hashPrivateFields,
    'inline-trivial-logic': inlineTrivialLogic,
    'intake-parse-only': intakeParseOnly,
    'interface-must-be-contract': interfaceMustBeContract,
    'interface-suffix': interfaceSuffix,
    'interfaces-compose-named-types': interfacesComposeNamedTypes,
    'known-types-outside-adapters': knownTypesOutsideAdapters,
    'layer-import-boundary': layerImportBoundary,
    'lexical-this-only': lexicalThisOnly,
    'no-function-registries': noFunctionRegistries,
    'no-mixed-callable-shapes': noMixedCallableShapes,
    'no-threaded-vocabulary': noThreadedVocabulary,
    'no-unparsed-assertion': noUnparsedAssertion,
    'prefer-collection-types': preferCollectionTypes,
    'require-options-object': requireOptionsObject,
    'single-export': singleExport,
    'static-method-verbs': staticMethodVerbs,
    'type-alias-invariants': typeAliasInvariants,
    'whole-canonical-types': wholeCanonicalTypes
  }
};
