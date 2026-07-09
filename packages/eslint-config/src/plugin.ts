import type { Rule } from 'eslint';

import { allTypesAreEntities } from './rules/allTypesAreEntities.js';
import { noThisAlias } from './rules/arch/noThisAlias.js';
import { constantsFolderRequired } from './rules/constantsFolderRequired.js';
import { entityNamespace } from './rules/entityNamespace.js';
import { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
import { interfacesComposeNamedTypes } from './rules/interfacesComposeNamedTypes.js';
import { interfaceSuffix } from './rules/interfaceSuffix.js';
import { noBindApplyCall } from './rules/noBindApplyCall.js';
import { noExportAlias } from './rules/noExportAlias.js';
import { noFreestandingVerbNoun } from './rules/noFreestandingVerbNoun.js';
import { noPreferExistingType } from './rules/noPreferExistingType.js';
import { noProjectInternalAcronyms } from './rules/noProjectInternalAcronyms.js';
import { noReadonlyInDataType } from './rules/noReadonlyInDataType.js';
import { noSuppressionComments } from './rules/noSuppressionComments.js';
import { noTrivialShim } from './rules/noTrivialShim.js';
import { noTypeAliasing } from './rules/noTypeAliasing.js';
import { noUnderscorePrivate } from './rules/noUnderscorePrivate.js';
import { preferCollectionTypes } from './rules/preferCollectionTypes.js';
import { requireOptionsObject } from './rules/requireOptionsObject.js';
import { singleExport } from './rules/singleExport.js';
import { typeAliasMustEndType } from './rules/typeAliasMustEndType.js';
import { typesDerivedFromSchema } from './rules/typesDerivedFromSchema.js';

export const plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'all-types-are-entities': allTypesAreEntities,
    'constants-folder-required': constantsFolderRequired,
    'entity-namespace': entityNamespace,
    'interface-must-be-contract': interfaceMustBeContract,
    'interface-suffix': interfaceSuffix,
    'interfaces-compose-named-types': interfacesComposeNamedTypes,
    'no-bind-apply-call': noBindApplyCall,
    'no-export-alias': noExportAlias,
    'no-freestanding-verb-noun': noFreestandingVerbNoun,
    'no-prefer-existing-type': noPreferExistingType,
    'no-project-internal-acronyms': noProjectInternalAcronyms,
    'no-readonly-in-data-type': noReadonlyInDataType,
    'no-suppression-comments': noSuppressionComments,
    'no-this-alias': noThisAlias,
    'no-trivial-shim': noTrivialShim,
    'no-type-aliasing': noTypeAliasing,
    'no-underscore-private': noUnderscorePrivate,
    'prefer-collection-types': preferCollectionTypes,
    'require-options-object': requireOptionsObject,
    'single-export': singleExport,
    'type-alias-must-end-type': typeAliasMustEndType,
    'types-derived-from-schema': typesDerivedFromSchema
  }
};
