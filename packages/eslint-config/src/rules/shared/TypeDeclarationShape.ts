import {
  type ArrayTypeNode,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isIdentifier,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isNumericLiteral,
  isParenthesizedTypeNode,
  isPropertySignature,
  isStringLiteral,
  isTypeLiteralNode,
  isUnionTypeNode,
  type LiteralTypeNode,
  ModifierFlags,
  type Node,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeNode,
  type UnionTypeNode
} from 'typescript';

export class TypeDeclarationShape {
  private static readonly primitiveShapes = new Map<SyntaxKind, string>([
    [SyntaxKind.BigIntKeyword, 'bigint'],
    [SyntaxKind.BooleanKeyword, 'boolean'],
    [SyntaxKind.NeverKeyword, 'never'],
    [SyntaxKind.NumberKeyword, 'number'],
    [SyntaxKind.ObjectKeyword, 'object'],
    [SyntaxKind.StringKeyword, 'string'],
    [SyntaxKind.SymbolKeyword, 'symbol'],
    [SyntaxKind.UndefinedKeyword, 'undefined'],
    [SyntaxKind.UnknownKeyword, 'unknown'],
    [SyntaxKind.VoidKeyword, 'void']
  ]);

  public static membersFor(declaration: InterfaceDeclaration | TypeAliasDeclaration): readonly Node[] | undefined {
    if (isInterfaceDeclaration(declaration)) {
      const result = declaration.members;

      return result;
    }

    if (isTypeLiteralNode(declaration.type)) {
      const result = declaration.type.members;

      return result;
    }

    return undefined;
  }

  public static hasRequiredMember(declaration: InterfaceDeclaration | TypeAliasDeclaration): boolean {
    const members = TypeDeclarationShape.membersFor(declaration);

    if (members === undefined) {
      return true;
    }

    const result = members.some((member) => {
      const isRequired = isPropertySignature(member) && member.questionToken === undefined;

      return isRequired;
    });

    return result;
  }

  public static forDeclaration(declaration: InterfaceDeclaration | TypeAliasDeclaration): string | undefined {
    if (declaration.typeParameters !== undefined && declaration.typeParameters.length > 0) {
      return undefined;
    }
    if (isInterfaceDeclaration(declaration)) {
      if (declaration.heritageClauses !== undefined && declaration.heritageClauses.length > 0) {
        return undefined;
      }

      const result = TypeDeclarationShape.objectMembers(declaration.members);

      return result;
    }

    const result = TypeDeclarationShape.forType(declaration.type);

    return result;
  }

  private static forType(type: TypeNode): string | undefined {
    if (isParenthesizedTypeNode(type)) {
      const result = TypeDeclarationShape.forType(type.type);

      return result;
    }
    if (isTypeLiteralNode(type)) {
      const result = TypeDeclarationShape.objectMembers(type.members);

      return result;
    }
    if (isArrayTypeNode(type)) {
      const result = TypeDeclarationShape.forArrayType(type);

      return result;
    }
    if (isUnionTypeNode(type)) {
      const result = TypeDeclarationShape.forUnionType(type);

      return result;
    }
    if (isLiteralTypeNode(type)) {
      const result = TypeDeclarationShape.forLiteralType(type);

      return result;
    }

    const result = TypeDeclarationShape.primitiveShapes.get(type.kind);

    return result;
  }

  private static forArrayType(type: ArrayTypeNode): string | undefined {
    const elementShape = TypeDeclarationShape.forType(type.elementType);

    if (elementShape === undefined) {
      return undefined;
    }

    return `array:${  elementShape}`;
  }

  private static forUnionType(type: UnionTypeNode): string | undefined {
    const memberShapes = TypeDeclarationShape.typeShapes(type.types);

    if (memberShapes === undefined) {
      return undefined;
    }

    return `union:${  memberShapes.toSorted().join('|')}`;
  }

  private static forLiteralType(type: LiteralTypeNode): string | undefined {
    const literal = type.literal;

    if (!isStringLiteral(literal) && !isNumericLiteral(literal) && literal.kind !== SyntaxKind.FalseKeyword && literal.kind !== SyntaxKind.TrueKeyword && literal.kind !== SyntaxKind.NullKeyword) {
      return undefined;
    }

    return `literal:${  literal.getText()}`;
  }

  private static objectMembers(members: readonly Node[]): string | undefined {
    if (members.length === 0) {
      return undefined;
    }

    const memberShapes: string[] = [];

    for (let index = 0; index < members.length; index += 1) {
      const member = members[index]!;

      if (!isPropertySignature(member) || member.type === undefined) {
        return undefined;
      }
      const name = TypeDeclarationShape.propertyName(member.name);
      const type = TypeDeclarationShape.forType(member.type);

      if (name === undefined || type === undefined) {
        return undefined;
      }
      const readOnly = (getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0 ? 'readonly' : 'mutable';
      const optional = member.questionToken === undefined ? 'required' : 'optional';

      memberShapes.push(`property:${  readOnly  }:${  optional  }:${  name  }:${  type}`);
    }

    return `object:${  memberShapes.toSorted().join('|')}`;
  }

  private static propertyName(name: Node): string | undefined {
    if (isIdentifier(name)) {
      return `identifier:${  name.text}`;
    }
    if (isStringLiteral(name)) {
      return `string:${  name.text}`;
    }
    if (isNumericLiteral(name)) {
      return `number:${  name.text}`;
    }

    return undefined;
  }

  private static typeShapes(types: readonly TypeNode[]): readonly string[] | undefined {
    const shapes: string[] = [];

    for (let index = 0; index < types.length; index += 1) {
      const shape = TypeDeclarationShape.forType(types[index]!);

      if (shape === undefined) {
        return undefined;
      }

      shapes.push(shape);
    }

    return shapes;
  }
}
