import type { Rule } from 'eslint';

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

const PRIMITIVE_TYPES = new Set([
  'TSAnyKeyword',
  'TSBigIntKeyword',
  'TSBooleanKeyword',
  'TSNeverKeyword',
  'TSNullKeyword',
  'TSNumberKeyword',
  'TSStringKeyword',
  'TSSymbolKeyword',
  'TSUndefinedKeyword',
  'TSUnknownKeyword',
  'TSVoidKeyword'
]);

class PrimitiveDisplay {
  public static get(type: string): string {
    switch (type) {
      case 'TSAnyKeyword': return 'any';
      case 'TSBigIntKeyword': return 'bigint';
      case 'TSBooleanKeyword': return 'boolean';
      case 'TSNeverKeyword': return 'never';
      case 'TSNullKeyword': return 'null';
      case 'TSNumberKeyword': return 'number';
      case 'TSStringKeyword': return 'string';
      case 'TSSymbolKeyword': return 'symbol';
      case 'TSUndefinedKeyword': return 'undefined';
      case 'TSUnknownKeyword': return 'unknown';
      case 'TSVoidKeyword': return 'void';
      default: return type;
    }
  }
}

class AstHelpers {
  public static getNodeType(node: unknown): string | undefined {
    if (!isJsonObject(node)) {
      return undefined;
    }
    const type = node.type;

    return typeof type === 'string' ? type : undefined;
  }

  public static getIdentifierName(node: unknown): string | undefined {
    if (!isJsonObject(node)) {
      return undefined;
    }
    const name = node.name;

    return typeof name === 'string' ? name : undefined;
  }

  public static getTypeArgNames(typeArguments: unknown): readonly string[] | undefined {
    if (!isJsonObject(typeArguments)) {
      return undefined;
    }
    const params = typeArguments.params;

    if (!Array.isArray(params)) {
      return undefined;
    }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const arg: unknown = params[i];

      if (!isJsonObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') {
        return undefined;
      }
      const typeName = arg.typeName;
      const name = AstHelpers.getIdentifierName(typeName);

      if (name === undefined) {
        return undefined;
      }
      names.push(name);
    }

    return names;
  }

  public static getTypeParamNames(typeParameters: unknown): readonly string[] {
    if (!isJsonObject(typeParameters)) {
      return [];
    }
    const params = typeParameters.params;

    if (!Array.isArray(params)) {
      return [];
    }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const param: unknown = params[i];
      // TSTypeParameter nodes have a `name` Identifier child, not a bare string.
      // e.g. { type: 'TSTypeParameter', name: { type: 'Identifier', name: 'T' } }
      const nameNode = isJsonObject(param) ? param.name : undefined;
      const name = AstHelpers.getIdentifierName(nameNode);

      if (name === undefined) {
        return [];
      }
      names.push(name);
    }

    return names;
  }
}

const hasTypeParameters = (node: unknown): boolean => {
  if (!isJsonObject(node)) {
    return false;
  }
  // node may be a TSTypeParameterDeclaration / TSTypeParameterInstantiation
  // (which carries .params directly) or a type alias / reference node that
  // carries .typeParameters / .typeArguments pointing to such a wrapper.
  let wrapper: Record<string, unknown> | undefined;
  if (Array.isArray(node.params)) {
    wrapper = node;
  } else if (isJsonObject(node.typeParameters)) {
    wrapper = node.typeParameters;
  } else if (isJsonObject(node.typeArguments)) {
    wrapper = node.typeArguments;
  }

  if (!isJsonObject(wrapper)) {
    return false;
  }
  const paramsBody = wrapper.params;

  if (!Array.isArray(paramsBody)) {
    return false;
  }

  return paramsBody.length > 0;
};

const isGenericForwardingShim = (
  leftNames: readonly string[],
  annotation: unknown
): { 'params': string; 'rhsName': string; } | undefined => {
  if (!isJsonObject(annotation) || AstHelpers.getNodeType(annotation) !== 'TSTypeReference') {
    return undefined;
  }
  const rhsTypeArgs = annotation.typeArguments ?? annotation.typeParameters;
  const rightNames = AstHelpers.getTypeArgNames(rhsTypeArgs);

  if (rightNames?.length !== leftNames.length) {
    return undefined;
  }

  const len = leftNames.length;
  for (let i = 0; i < len; i += 1) {
    if (leftNames[i] !== rightNames[i]) {
      return undefined;
    }
  }
  const typeName = annotation.typeName;
  const rhsName = AstHelpers.getIdentifierName(typeName);

  if (rhsName === undefined) {
    return undefined;
  }

  return { 'params': leftNames.join(', '), 'rhsName': rhsName };
};

export const noTypeAliasing: Rule.RuleModule = {
  'create': (context) => {
    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'id': { 'name': string };
        'typeAnnotation': unknown;
        'typeParameters': unknown;
      };

      const leftParamNames = AstHelpers.getTypeParamNames(rawNode.typeParameters);

      if (leftParamNames.length > 0) {
        const forwarding = isGenericForwardingShim(leftParamNames, rawNode.typeAnnotation);

        if (forwarding !== undefined) {
          context.report({
            'data': { 'name': rawNode.id.name, 'params': forwarding.params, 'rhs': forwarding.rhsName },
            'messageId': 'genericForwardingAlias',
            'node': node
          });
        }

        return;
      }

      const annotation = rawNode.typeAnnotation;
      const annotationType = AstHelpers.getNodeType(annotation);

      if (annotationType === undefined) {
        return;
      }

      if (PRIMITIVE_TYPES.has(annotationType)) {
        const display = PrimitiveDisplay.get(annotationType);

        context.report({
          'data': { 'name': rawNode.id.name, 'rhs': display },
          'messageId': 'primitiveTypeAlias',
          'node': node
        });

        return;
      }

      if (annotationType === 'TSTypeReference') {
        if (hasTypeParameters(annotation)) {
          return;
        }
        const typeName = isJsonObject(annotation) ? annotation.typeName : undefined;
        const rhsName = AstHelpers.getIdentifierName(typeName);

        if (rhsName === undefined) {
          return;
        }

        context.report({
          'data': { 'name': rawNode.id.name, 'rhs': rhsName },
          'messageId': 'nakedTypeAlias',
          'node': node
        });
      }
    };

    const onImportSpecifier = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'imported': { 'name': string };
        'local': { 'name': string };
      };

      const importedName = rawNode.imported.name;
      const localName = rawNode.local.name;

      if (importedName === localName) {
        return;
      }

      context.report({
        'data': { 'imported': importedName, 'local': localName },
        'messageId': 'importAlias',
        'node': node
      });
    };

    return {
      'ImportSpecifier': onImportSpecifier,
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow naked type re-aliases and import aliases that hide canonical names.',
      'recommended': false
    },
    'messages': {
      'genericForwardingAlias': "Type alias '{{name}}' is a generic forwarding shim — '{{rhs}}<{{params}}>' renames '{{rhs}}' without transformation. Use '{{rhs}}' directly with the type arguments at each call site.",
      'importAlias': "Import alias '{{local}}' hides the canonical name '{{imported}}'. Use '{{imported}}' directly.",
      'nakedTypeAlias': "Type alias '{{name}}' is a naked rename of '{{rhs}}'. Use '{{rhs}}' directly — do not create local synonyms for canonical types.",
      'primitiveTypeAlias': "Type alias '{{name}}' wraps primitive type '{{rhs}}'. Use '{{rhs}}' directly."
    },
    'schema': [],
    'type': 'problem'
  }
};
