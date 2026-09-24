import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';
import {
  getCombinedModifierFlags,
  isIdentifier,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  isTypeQueryNode,
  isTypeReferenceNode,
  isVariableStatement,
  ModifierFlags,
  type Node,
  type Program,
  type Statement,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeNode,
  type VariableStatement
} from 'typescript';

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
    if (!Predicates.isRecord(value)) {
      return false;
    }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;

    if (!Predicates.isRecord(program) || !Predicates.isRecord(nodeMap)) {
      return false;
    }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';

    return result;
  }
}

class EntityTypeDeclaration {
  static isCanonical(declaration: TypeAliasDeclaration): boolean {
    if (declaration.name.text !== 'Type') {
      return false;
    }
    if ((getCombinedModifierFlags(declaration) & ModifierFlags.Export) === 0) {
      return false;
    }

    const namespaceBlock = declaration.parent;

    if (!isModuleBlock(namespaceBlock)) {
      return false;
    }

    if (!EntityTypeDeclaration.isSchemaDerivedTypeReference(declaration.type)) {
      return false;
    }

    const ownsExportedSchema = namespaceBlock.statements.some(EntityTypeDeclaration.statementOwnsExportedSchema);

    if (!ownsExportedSchema) {
      return false;
    }

    const namespaceDeclaration = namespaceBlock.parent;

    const result = isModuleDeclaration(namespaceDeclaration)
      && isIdentifier(namespaceDeclaration.name)
      && namespaceDeclaration.name.text.endsWith('Entity');

    return result;
  }

  private static isSchemaDerivedTypeReference(typeNode: TypeNode): boolean {
    if (!isTypeReferenceNode(typeNode)) {
      return false;
    }
    const [schemaArgument] = typeNode.typeArguments ?? [];

    const result = schemaArgument !== undefined
      && isTypeQueryNode(schemaArgument)
      && isIdentifier(schemaArgument.exprName)
      && schemaArgument.exprName.text === 'Schema';

    return result;
  }

  private static statementOwnsExportedSchema(statement: Statement): boolean {
    if (!isVariableStatement(statement)) {
      return false;
    }

    if (!EntityTypeDeclaration.statementIsExported(statement)) {
      return false;
    }

    const declarations = statement.declarationList.declarations;
    const result = declarations.some((schemaDeclaration) => {
      const isSchema = isIdentifier(schemaDeclaration.name) && schemaDeclaration.name.text === 'Schema';

      return isSchema;
    });

    return result;
  }

  private static statementIsExported(statement: VariableStatement): boolean {
    const modifiers = statement.modifiers;
    const isExported = modifiers?.some((modifier) => {
      const isExportKeyword = modifier.kind === SyntaxKind.ExportKeyword;

      return isExportKeyword;
    });
    const result = isExported ?? false;

    return result;
  }
}

export const allTypesAreEntities: Rule.RuleModule = {
  'create': (context) => {
    const services: unknown = context.sourceCode.parserServices;

    if (!ParserServices.has(services)) {
      return {};
    }

    const classification = TypeContractClassification.forProgram(services.program);

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const declaration = services.esTreeNodeToTSNodeMap.get(node);

      if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
        return;
      }
      const analysis = classification.analyzeAlias(declaration);

      if (analysis.classification !== 'pureDataCanonical') {
        return;
      }
      if (analysis.reason === 'fromSchema' && EntityTypeDeclaration.isCanonical(declaration)) {
        return;
      }

      context.report({
        'data': { 'name': declaration.name.text },
        'messageId': 'forbidden-type-alias',
        'node': node
      });
    };

    const onTSInterfaceDeclaration = (node: Rule.Node): void => {
      const declaration = services.esTreeNodeToTSNodeMap.get(node);

      if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
        return;
      }

      const extendsClause = (declaration.heritageClauses ?? []).find((clause) => {
        const result = clause.token === SyntaxKind.ExtendsKeyword;

        return result;
      });

      if (extendsClause === undefined) {
        return;
      }

      let hasSchemaDerivedHeritage = false;

      for (const type of extendsClause.types) {
        if (classification.isSchemaDerivedHeritageType(type)) {
          hasSchemaDerivedHeritage = true;
          break;
        }
      }
      if (!hasSchemaDerivedHeritage) {
        return;
      }
      if (classification.isCanonicalEntityInterface(declaration)) {
        return;
      }

      context.report({
        'data': { 'name': declaration.name.text },
        'messageId': 'forbidden-type-alias',
        'node': node
      });
    };

    return {
      'TSInterfaceDeclaration': onTSInterfaceDeclaration, 'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': "Require every canonical pure-data alias to be an exported '*Entity.Type' derived from its namespace's Schema.",
      'recommended': false
    },
    'messages': { 'forbidden-type-alias': "Canonical pure-data alias '{{name}}' must be the exported 'Type' member of an '*Entity' namespace and derive directly from that entity's JSON Schema." },
    'schema': [],
    'type': 'problem'
  }
};
