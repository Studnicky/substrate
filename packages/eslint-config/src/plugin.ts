import type { Rule } from 'eslint';

import { allTypesAreEntities } from './rules/allTypesAreEntities.js';
import { adapterOnlyImport } from './rules/arch/adapterOnlyImport.js';
import { domainPurity } from './rules/arch/domainPurity.js';
import { intakeParseOnly } from './rules/arch/intakeParseOnly.js';
import { knownTypesOutsideAdapters } from './rules/arch/knownTypesOutsideAdapters.js';
import { layerImportBoundary } from './rules/arch/layerImportBoundary.js';
import { lexicalThisOnly } from './rules/arch/lexicalThisOnly.js';
import { noCircularImports } from './rules/arch/noCircularImports.js';
import { noDoubleAssertion } from './rules/arch/noDoubleAssertion.js';
import { noReflectArgumentLaundering } from './rules/arch/noReflectArgumentLaundering.js';
import { noThreadedVocabulary } from './rules/arch/noThreadedVocabulary.js';
import { noUncheckedOverloadImplementation } from './rules/arch/noUncheckedOverloadImplementation.js';
import { noUnparsedAssertion } from './rules/arch/noUnparsedAssertion.js';
import { cleanDiagnostics } from './rules/cleanDiagnostics.js';
import { descriptiveIdentifiers } from './rules/descriptiveIdentifiers.js';
import { directInvocationOnly } from './rules/directInvocationOnly.js';
import { entityFileShape } from './rules/entityFileShape.js';
import { explicitReturnBinding } from './rules/explicitReturnBinding.js';
import { exportShape } from './rules/exportShape.js';
import { hashPrivateFields } from './rules/hashPrivateFields.js';
import { inlineTrivialLogic } from './rules/inlineTrivialLogic.js';
import { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
import { interfacesComposeNamedTypes } from './rules/interfacesComposeNamedTypes.js';
import { noFunctionRegistries } from './rules/noFunctionRegistries.js';
import { noMixedCallableShapes } from './rules/noMixedCallableShapes.js';
import { noRedefinedExternalTypes } from './rules/noRedefinedExternalTypes.js';
import { preferCollectionTypes } from './rules/preferCollectionTypes.js';
import { requireOptionsObject } from './rules/requireOptionsObject.js';
import { staticMethodVerbs } from './rules/staticMethodVerbs.js';
import { typeAliasInvariants } from './rules/typeAliasInvariants.js';

export const plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'adapter-only-import': adapterOnlyImport,
    'all-types-are-entities': allTypesAreEntities,
    'clean-diagnostics': cleanDiagnostics,
    'descriptive-identifiers': descriptiveIdentifiers,
    'direct-invocation-only': directInvocationOnly,
    'domain-purity': domainPurity,
    'entity-file-shape': entityFileShape,
    'explicit-return-binding': explicitReturnBinding,
    'export-shape': exportShape,
    'hash-private-fields': hashPrivateFields,
    'inline-trivial-logic': inlineTrivialLogic,
    'intake-parse-only': intakeParseOnly,
    'interface-must-be-contract': interfaceMustBeContract,
    'interfaces-compose-named-types': interfacesComposeNamedTypes,
    'known-types-outside-adapters': knownTypesOutsideAdapters,
    'layer-import-boundary': layerImportBoundary,
    'lexical-this-only': lexicalThisOnly,
    'no-circular-imports': noCircularImports,
    'no-double-assertion': noDoubleAssertion,
    'no-function-registries': noFunctionRegistries,
    'no-mixed-callable-shapes': noMixedCallableShapes,
    'no-redefined-external-types': noRedefinedExternalTypes,
    'no-reflect-argument-laundering': noReflectArgumentLaundering,
    'no-threaded-vocabulary': noThreadedVocabulary,
    'no-unchecked-overload-implementation': noUncheckedOverloadImplementation,
    'no-unparsed-assertion': noUnparsedAssertion,
    'prefer-collection-types': preferCollectionTypes,
    'require-options-object': requireOptionsObject,
    'static-method-verbs': staticMethodVerbs,
    'type-alias-invariants': typeAliasInvariants
  }
};
