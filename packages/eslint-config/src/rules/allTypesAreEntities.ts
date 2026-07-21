import type { Rule } from 'eslint';

import {
  getCombinedModifierFlags,
  isIdentifier,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  isTypeQueryNode,
  isTypeReferenceNode,
  isVariableStatement,
  ModifierFlags,
  type Node,
  type Program,
  SyntaxKind,
  type TypeAliasDeclaration
} from 'typescript';

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
  static has(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!ObjectGuard.isObject(program) || !ObjectGuard.isObject(nodeMap)) { return false; }

    return typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
  }
}

class EntityTypeDeclaration {
  static isCanonical(declaration: TypeAliasDeclaration): boolean {
    if (declaration.name.text !== 'Type') { return false; }
    if ((getCombinedModifierFlags(declaration) & ModifierFlags.Export) === 0) { return false; }

    const namespaceBlock = declaration.parent;
    if (!isModuleBlock(namespaceBlock)) { return false; }

    if (!isTypeReferenceNode(declaration.type)) { return false; }
    const [schemaArgument] = declaration.type.typeArguments ?? [];
    if (
      schemaArgument === undefined
      || !isTypeQueryNode(schemaArgument)
      || !isIdentifier(schemaArgument.exprName)
      || schemaArgument.exprName.text !== 'Schema'
    ) {
      return false;
    }

    const ownsExportedSchema = namespaceBlock.statements.some((statement) => {
      if (!isVariableStatement(statement)) { return false; }
      const exported = statement.modifiers?.some((modifier) => {
        return modifier.kind === SyntaxKind.ExportKeyword;
      }) ?? false;
      if (!exported) { return false; }
      return statement.declarationList.declarations.some((schemaDeclaration) => {
        return isIdentifier(schemaDeclaration.name) && schemaDeclaration.name.text === 'Schema';
      });
    });
    if (!ownsExportedSchema) { return false; }

    const namespaceDeclaration = namespaceBlock.parent;
    return isModuleDeclaration(namespaceDeclaration)
      && isIdentifier(namespaceDeclaration.name)
      && namespaceDeclaration.name.text.endsWith('Entity');
  }
}

export const allTypesAreEntities: Rule.RuleModule = {
  'create': (context) => {
    const services: unknown = context.sourceCode.parserServices;
    if (!ParserServices.has(services)) { return {}; }

    const classification = TypeContractClassification.forProgram(services.program);

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const declaration = services.esTreeNodeToTSNodeMap.get(node);
      if (declaration === undefined || !isTypeAliasDeclaration(declaration)) { return; }
      const analysis = classification.analyzeAlias(declaration);
      if (analysis.classification !== 'pureDataCanonical') { return; }
      if (analysis.reason === 'fromSchema' && EntityTypeDeclaration.isCanonical(declaration)) { return; }

      context.report({
        'data': { 'name': declaration.name.text },
        'messageId': 'forbidden-type-alias',
        'node': node
      });
    };

    return { 'TSTypeAliasDeclaration': onTSTypeAliasDeclaration };
  },
  'meta': {
    'docs': {
      'description': "Require every canonical pure-data alias to be an exported '*Entity.Type' derived from its namespace's Schema.",
      'recommended': false
    },
    'messages': {
      'forbidden-type-alias': "Canonical pure-data alias '{{name}}' must be the exported 'Type' member of an '*Entity' namespace and derive directly from that entity's JSON Schema."
    },
    'schema': [],
    'type': 'problem'
  }
};
