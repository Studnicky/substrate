import type { Rule } from 'eslint';

import { noThisAlias } from './rules/arch/noThisAlias.js';
import { entityNamespace } from './rules/entityNamespace.js';
import { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
import { noBindApplyCall } from './rules/noBindApplyCall.js';
import { noSuppressionComments } from './rules/noSuppressionComments.js';
import { noTrivialShim } from './rules/noTrivialShim.js';
import { singleExport } from './rules/singleExport.js';
import { typeAliasMustEndType } from './rules/typeAliasMustEndType.js';

export const plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'entity-namespace': entityNamespace,
    'interface-must-be-contract': interfaceMustBeContract,
    'no-bind-apply-call': noBindApplyCall,
    'no-suppression-comments': noSuppressionComments,
    'no-this-alias': noThisAlias,
    'no-trivial-shim': noTrivialShim,
    'single-export': singleExport,
    'type-alias-must-end-type': typeAliasMustEndType
  }
};
