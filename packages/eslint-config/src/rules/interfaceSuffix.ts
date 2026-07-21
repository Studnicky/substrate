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

class InterfaceSuffix {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    const services: unknown = context.sourceCode.parserServices;
    if (!ParserServices.has(services)) { return {}; }

    const classification = TypeContractClassification.forProgram(services.program);

    const onTSInterfaceDeclaration = (node: Rule.Node): void => {
      const declaration = services.esTreeNodeToTSNodeMap.get(node);
      if (declaration === undefined || !isInterfaceDeclaration(declaration)) { return; }
      if (classification.analyzeInterface(declaration).classification === 'pureData') { return; }

      const name = declaration.name.text;
      if (name.endsWith('Interface')) { return; }
      context.report({ 'data': { 'name': name }, 'messageId': 'missing-interface-suffix', 'node': node });
    };
    return { 'TSInterfaceDeclaration': onTSInterfaceDeclaration };
  }
}

export const interfaceSuffix: Rule.RuleModule = {
  'create': InterfaceSuffix.create,
  'meta': {
    'docs': { 'description': "Every retained contract interface's name must end with 'Interface', including interfaces declared inside a namespace.", 'recommended': false },
    'messages': { 'missing-interface-suffix': 'Interface name \'{{name}}\' must end with \'Interface\'. This applies everywhere, including inside namespaces — the suffix is not optional.' },
    'schema': [],
    'type': 'problem'
  }
};
