import type { Rule } from 'eslint';

import { type Program, type Symbol, SyntaxKind, type Type, type TypeChecker } from 'typescript';

/**
 * whole-canonical-types — canonical data shapes (named `type`/`interface` declarations
 * this codebase owns, most often entity `.Type`s) must be consumed whole. `Partial<X>`,
 * `Pick<X, K>`, and `Omit<X, K>` silently narrow a canonical shape into an ad-hoc subset,
 * so downstream consumers stop being forced to reckon with every property the canonical
 * shape actually carries. If a genuinely different shape is needed, define an explicit
 * type/entity for it instead of deriving one positionally from the canonical type.
 *
 * `Partial`/`Pick`/`Omit` applied to a local generic type parameter, an inline object-literal
 * type, or a type declared outside this codebase (node_modules) are not flagged — those are
 * not "our" canonical domain shapes being silently subsetted.
 */

const SUBSETTING_UTILITY_NAMES = new Set(['Omit', 'Partial', 'Pick']);

type ParserServicesType = {
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
};

// json-schema-uninexpressible: wraps ParserServicesType, whose members are function-typed —
// function types have no JSON Schema equivalent
type SourceCodeServicesAccessorType = {
  readonly 'parserServices'?: ParserServicesType;
};

class AstHelpers {
  public static isJsonObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }

  public static getNodeType(node: unknown): string | undefined {
    if (!AstHelpers.isJsonObject(node)) { return undefined; }
    const type = node.type;
    return typeof type === 'string' ? type : undefined;
  }

  public static getIdentifierName(node: unknown): string | undefined {
    if (!AstHelpers.isJsonObject(node)) { return undefined; }
    const name = node.name;
    return typeof name === 'string' ? name : undefined;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesType | undefined {
    const result = (context.sourceCode as unknown as SourceCodeServicesAccessorType).parserServices;
    return result;
  }
}

class SubsettingUtilityMatch {
  public static getUtilityName(node: Record<string, unknown>): string | undefined {
    if (AstHelpers.getNodeType(node) !== 'TSTypeReference') { return undefined; }
    const name = AstHelpers.getIdentifierName(node.typeName);
    if (name === undefined || !SUBSETTING_UTILITY_NAMES.has(name)) { return undefined; }
    return name;
  }

  public static getFirstTypeArgument(node: Record<string, unknown>): unknown {
    const wrapper = node.typeArguments ?? node.typeParameters;
    if (!AstHelpers.isJsonObject(wrapper)) { return undefined; }
    const params = wrapper.params;
    if (!Array.isArray(params)) { return undefined; }
    return params[0];
  }
}

class CanonicalTypeResolution {
  public static isCanonicalOwnedType(typeArgNode: unknown, services: ParserServicesType): boolean {
    if (!AstHelpers.isJsonObject(typeArgNode)) { return false; }
    if (AstHelpers.getNodeType(typeArgNode) !== 'TSTypeReference') { return false; }

    const type = services.getTypeAtLocation(typeArgNode);
    const symbol: Symbol | undefined = type.aliasSymbol ?? type.getSymbol();
    if (symbol === undefined) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    if (declarations.length === 0) { return false; }

    const isGenericParameter = declarations.some((declaration) => { return declaration.kind === SyntaxKind.TypeParameter; });
    if (isGenericParameter) { return false; }

    const isNamedTypeDeclaration = declarations.some((declaration) => {
      return declaration.kind === SyntaxKind.TypeAliasDeclaration || declaration.kind === SyntaxKind.InterfaceDeclaration;
    });
    if (!isNamedTypeDeclaration) { return false; }

    const isExternallyOwned = declarations.every((declaration) => {
      const fileName = declaration.getSourceFile().fileName;
      return fileName.includes('/node_modules/');
    });
    return !isExternallyOwned;
  }
}

export const wholeCanonicalTypes: Rule.RuleModule = {
  'create': (context) => {
    const services = ContextHelpers.getServices(context);
    const checker: TypeChecker | undefined = services?.program === undefined ? undefined : services.program.getTypeChecker();

    if (services === undefined || checker === undefined) { return {}; }

    const onTSTypeReference = (node: Rule.Node): void => {
      const rawNode = node as unknown as Record<string, unknown>;
      const utilityName = SubsettingUtilityMatch.getUtilityName(rawNode);
      if (utilityName === undefined) { return; }

      const typeArgNode = SubsettingUtilityMatch.getFirstTypeArgument(rawNode);
      if (!CanonicalTypeResolution.isCanonicalOwnedType(typeArgNode, services)) { return; }

      context.report({
        'data': { 'utility': utilityName },
        'messageId': 'noPartialCanonicalType',
        'node': node
      });
    };

    return { 'TSTypeReference': onTSTypeReference };
  },
  'meta': {
    'docs': {
      'description': "Disallow deriving 'Partial'/'Pick'/'Omit' subset views from canonical, codebase-owned named types/interfaces. Canonical data shapes must be consumed whole — define an explicit type for a genuinely different shape instead of positionally subsetting one.",
      'recommended': false
    },
    'messages': {
      'noPartialCanonicalType': "'{{utility}}<...>' derives an implicit subset of a canonical type. A partial type masks what the real data shape is — consumers must always be aware of every property a canonical shape carries. Use the full type, or define an explicit, fully-spelled-out type/entity for the shape you actually need. There is no exemption for this rule."
    },
    'schema': [],
    'type': 'problem'
  }
};
