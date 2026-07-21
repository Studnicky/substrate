import type { Rule } from 'eslint';

import { isInterfaceDeclaration, type Node, type Program } from 'typescript';

import { ObjectGuard } from './shared/ObjectGuard.js';
import { TypeContractClassification } from './shared/TypeContractClassification.js';

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!ObjectGuard.isObject(program) || !ObjectGuard.isObject(nodeMap)) { return false; }

    return typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
  }
}

export const interfaceMustBeContract: Rule.RuleModule = {
  'create': (context) => {
    const servicesUnknown: unknown = context.sourceCode.parserServices;
    if (!ParserServices.has(servicesUnknown)) { return {}; }

    const classification = TypeContractClassification.forProgram(servicesUnknown.program);

    const visitTSInterfaceDeclaration = (node: Rule.Node): void => {
      const declaration = servicesUnknown.esTreeNodeToTSNodeMap.get(node);
      if (declaration === undefined || !isInterfaceDeclaration(declaration)) { return; }
      if (classification.analyzeInterface(declaration).classification === 'contract') { return; }

      context.report({
        'data': { 'name': declaration.name.text },
        'messageId': 'dataShapeMustBeType',
        'node': node
      });
    };

    return { 'TSInterfaceDeclaration': visitTSInterfaceDeclaration };
  },
  'meta': {
    'docs': {
      'description':
        'Interfaces express runtime and access contracts. A pure JSON-data interface must be replaced with a schema-derived entity type or canonical pure-data composition.'
    },
    'messages': {
      'dataShapeMustBeType':
        "Interface '{{name}}' contains only pure data and has no runtime or access-contract signal. Define the data as a schema-derived entity type or compose an existing canonical pure-data type; this remediation requires entity/schema construction and is not autofixed."
    },
    'schema': [],
    'type': 'problem'
  }
};
