import type * as ts from 'typescript';

import {
  type InterfaceDeclaration,
  type IntersectionTypeNode,
  isCallSignatureDeclaration,
  isComputedPropertyName,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isFunctionTypeNode,
  isIdentifier,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isStringLiteral,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type PropertySignature,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  TypeFlags,
  type TypeLiteralNode,
  type TypeNode,
  type TypeReferenceNode,
  type UnionTypeNode
} from 'typescript';

import type { TypeContractContextInterface } from './TypeContractContextInterface.js';

import { type CallabilityClassificationInterface } from './CallabilityClassificationInterface.js';
import { type CallabilityFlagsInterface } from './CallabilityFlagsInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';

export class TypeContractCallabilityClassification implements CallabilityClassificationInterface {
  public constructor(private readonly context: TypeContractContextInterface) {}

  // Every function value's own intrinsic properties, per the ECMAScript/TypeScript `Function`
  // interface: `prototype` (constructible functions), `name`, `length`, plus the two
  // non-strict-mode legacy own properties `arguments`/`caller`. Naming ONLY these adds no data
  // shape beyond what `Function` already carries — see `isIntrinsicFunctionIntersection`'s call
  // site in `classifyCallability` for the full reasoning.
  private static readonly INTRINSIC_FUNCTION_MEMBER_NAMES = new Set([
    'arguments',
    'caller',
    'length',
    'name',
    'prototype'
  ]);

  private classifyCallabilityUnwrap(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface | undefined {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = this.classifyCallability(node.type, visiting, depth + 1);

      return result;
    }

    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = this.classifyCallability(node.type, visiting, depth + 1);

      return result;
    }

    return undefined;
  }

  private classifyCallabilityTerminal(node: TypeNode): CallabilityFlagsInterface | undefined {
    const kind = node.kind;

    if (kind === SyntaxKind.UndefinedKeyword || kind === SyntaxKind.NeverKeyword) {
      return {
        'hasCallable': false, 'hasData': false
      };
    }

    // `any` accepts a callable value just as readily as a data value, but TypeScript's own
    // "any callable" idiom is `Function`, not `any` — a caller reaching for the loosest type
    // still means to admit callables. Treating `any` as neutral would let `any | { a: 1 }` slip
    // past the mix check the same way an untyped `Function` member would.
    if (kind === SyntaxKind.AnyKeyword) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }

    // `null` as a type is a `LiteralTypeNode` wrapping a `NullKeyword` literal, not a bare
    // keyword type node — unlike `undefined`, which TypeScript represents directly.
    if (isLiteralTypeNode(node) && node.literal.kind === SyntaxKind.NullKeyword) {
      return {
        'hasCallable': false, 'hasData': false
      };
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }

    // `Function & { readonly 'prototype': TInstance }` static-factory idiom is not a mixed
    // shape — see no-mixed-callable-shapes.md Detection.
    if (isIntersectionTypeNode(node) && this.isIntrinsicFunctionIntersection(node)) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }

    return undefined;
  }

  private classifyCallabilityComposite(
    node: IntersectionTypeNode | UnionTypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface {
    let hasCallable = false;
    let hasData = false;
    const members = node.types;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const classified = this.classifyCallability(member, visiting, depth + 1);

      hasCallable = hasCallable || classified.hasCallable;
      hasData = hasData || classified.hasData;
    }

    return {
      'hasCallable': hasCallable, 'hasData': hasData
    };
  }

  private classifyCallabilityTypeLiteral(node: TypeLiteralNode): CallabilityFlagsInterface {
    const isCallableLiteral = node.members.some((member) => {
      const result = isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member);

      return result;
    });

    const result = isCallableLiteral
      ? {
        'hasCallable': true, 'hasData': false
      }
      : {
        'hasCallable': false, 'hasData': true
      };

    return result;
  }

  // Declaration merging lets a call signature live in any one of several merged
  // `interface X { ... }` blocks for the same symbol — OR the check across every merged
  // part rather than only the first declaration TypeScript happens to report.
  private classifyCallabilityInterfaceReference(
    interfaceDeclarations: readonly InterfaceDeclaration[]
  ): CallabilityFlagsInterface {
    let hasCallSignature = false;
    const interfaceDeclarationCount = interfaceDeclarations.length;

    for (let index = 0; index < interfaceDeclarationCount; index += 1) {
      const interfaceDeclaration = interfaceDeclarations.at(index);

      if (interfaceDeclaration !== undefined && this.context.interfaceContract.interfaceHasCallSignature(interfaceDeclaration, new Set(), 0)) {
        hasCallSignature = true;
        break;
      }
    }

    if (hasCallSignature) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }
    const firstInterfaceDeclaration = interfaceDeclarations.at(0);

    if (
      firstInterfaceDeclaration !== undefined
      && this.context.analyzeInterface(firstInterfaceDeclaration).classification === 'pureData'
    ) {
      return {
        'hasCallable': false, 'hasData': true
      };
    }

    // A method, brand, class-instance, readonly, or other non-JSON contract reason is a
    // runtime contract in this codebase's own ontology (see `interface-must-be-contract`),
    // not schema-derived data. `Promise`, `Map`, and similar lib interfaces land here too —
    // treating their methods as call evidence would flag the pervasive `Promise<T> | T`
    // return-type idiom as mixed. Neither flag; it never makes a union "mixed" on its own.
    return {
      'hasCallable': false, 'hasData': false
    };
  }

  private classifyCallabilityAliasReference(
    node: TypeReferenceNode,
    symbol: Symbol | undefined,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface {
    if (symbol === undefined || visiting.has(symbol)) {
      return {
        'hasCallable': false, 'hasData': true
      };
    }

    const alias = this.context.aliasDeclarationForSymbol(symbol);

    if (alias === undefined) {
      return {
        'hasCallable': false, 'hasData': true
      };
    }

    // A generic identity/passthrough alias (`type Wrap<T> = T;`) declares a bare
    // type-parameter body. Recursing into that unsubstituted body loses the concrete type
    // argument supplied at this reference site (`Wrap<() => void>` would recurse into bare
    // `T`, not `() => void`). Resolve the caller's actual type at this reference instead.
    if (this.isBareTypeParameterReference(alias.type)) {
      const result = this.classifyCallabilityFromResolvedType(this.context.checker.getTypeAtLocation(node), new Set());

      return result;
    }

    const nextVisiting = new Set(visiting);

    nextVisiting.add(symbol);

    const result = this.classifyCallability(alias.type, nextVisiting, depth + 1);

    return result;
  }

  private classifyCallabilityTypeReference(
    node: TypeReferenceNode,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface {
    if (this.context.aliasResolution.isArrayLikeIntrinsicReference(node)) {
      return {
        'hasCallable': false, 'hasData': true
      };
    }

    // `Function` is TypeScript's own "any callable" type — it resolves to the global
    // `lib.d.ts` interface, which itself declares no call signature (it is expressed as a
    // method-bearing interface: `apply`, `call`, `bind`), so it would otherwise fall into the
    // generic non-JSON-contract fallback below and silently exempt itself from the mix check.
    if (this.context.isIntrinsic(node, 'Function')) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));
    const interfaceDeclarations = symbol?.getDeclarations()?.filter(isInterfaceDeclaration) ?? [];

    if (interfaceDeclarations.length > 0) {
      const result = this.classifyCallabilityInterfaceReference(interfaceDeclarations);

      return result;
    }

    const result = this.classifyCallabilityAliasReference(node, symbol, visiting, depth);

    return result;
  }

  public classifyCallability(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'hasCallable': false, 'hasData': true
      };
    }

    const unwrapped = this.classifyCallabilityUnwrap(node, visiting, depth);

    if (unwrapped !== undefined) {
      return unwrapped;
    }

    const terminal = this.classifyCallabilityTerminal(node);

    if (terminal !== undefined) {
      return terminal;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const result = this.classifyCallabilityComposite(node, visiting, depth);

      return result;
    }

    if (isTypeLiteralNode(node)) {
      const result = this.classifyCallabilityTypeLiteral(node);

      return result;
    }

    if (isTypeReferenceNode(node)) {
      const result = this.classifyCallabilityTypeReference(node, visiting, depth);

      return result;
    }

    return {
      'hasCallable': false, 'hasData': true
    };
  }

  /**
   * True when `node` is `Function & { ... }` (or `SomeFunctionType & { ... }`) where every
   * non-callable constituent is a type literal naming only intrinsic function properties. See
   * the module comment at this method's call site for the full reasoning.
   */
  private isIntrinsicFunctionIntersection(node: IntersectionTypeNode): boolean {
    let hasCallableAnchor = false;
    const members = node.types;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      if (this.isCallableAnchor(member)) {
        hasCallableAnchor = true;
        continue;
      }
      if (!TypeContractCallabilityClassification.isAllIntrinsicFunctionMembersLiteral(member)) {
        return false;
      }
    }

    return hasCallableAnchor;
  }

  /** A function type node, a construct-signature type node, or the `Function` intrinsic. */
  private isCallableAnchor(node: TypeNode): boolean {
    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      return true;
    }

    const result = isTypeReferenceNode(node) && this.context.isIntrinsic(node, 'Function');

    return result;
  }

  /**
   * True when `node` is a type literal whose every member is a non-computed `PropertySignature`
   * named from {@link INTRINSIC_FUNCTION_MEMBER_NAMES}. A method signature, an index signature,
   * a call/construct signature, or a computed or non-intrinsic property name disqualifies —
   * that member is genuine data (or a genuine second callable shape) riding along with the
   * anchor, and the intersection stays a real mix.
   */
  private static isAllIntrinsicFunctionMembersLiteral(node: TypeNode): boolean {
    if (!isTypeLiteralNode(node)) {
      return false;
    }

    const members = node.members;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      if (!isPropertySignature(member) || isComputedPropertyName(member.name)) {
        return false;
      }

      const name = TypeContractCallabilityClassification.staticPropertyName(member.name);

      if (name === undefined || !TypeContractCallabilityClassification.INTRINSIC_FUNCTION_MEMBER_NAMES.has(name)) {
        return false;
      }
    }

    return true;
  }

  /** Reads an `Identifier` or string-`Literal` property name's static text, else `undefined`. */
  private static staticPropertyName(node: PropertySignature['name']): string | undefined {
    if (isIdentifier(node)) {
      return node.text;
    }
    if (isStringLiteral(node)) {
      return node.text;
    }

    return undefined;
  }

  /**
   * Detects whether a generic alias's declared body is (or reduces to, through a parenthesized
   * wrapper) a bare reference to one of its own type parameters — the shape of an
   * identity/passthrough alias like `type Wrap<T> = T;`. Such a body carries no callable/data
   * information of its own; the caller's substituted type argument does.
   */
  private isBareTypeParameterReference(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node)) {
      const result = this.isBareTypeParameterReference(node.type);

      return result;
    }
    if (!isTypeReferenceNode(node)) {
      return false;
    }
    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    const result = symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0;

    return result;
  }

  /**
   * Classifies callable/data composition from an already-resolved `Type` rather than a syntactic
   * `TypeNode` — used when a generic alias's type parameter has been substituted with a concrete
   * type argument at the reference site and there is no longer a declared `TypeNode` to recurse
   * into syntactically.
   */
  private classifyCallabilityFromResolvedType(type: ts.Type, seen: Set<ts.Type>): CallabilityFlagsInterface {
    if (seen.has(type)) {
      return {
        'hasCallable': false, 'hasData': false
      };
    }
    seen.add(type);

    if (type.isUnion() || type.isIntersection()) {
      let hasCallable = false;
      let hasData = false;

      type.types.forEach((constituent) => {
        const classified = this.classifyCallabilityFromResolvedType(constituent, seen);

        hasCallable = hasCallable || classified.hasCallable;
        hasData = hasData || classified.hasData;
      });

      return {
        'hasCallable': hasCallable, 'hasData': hasData
      };
    }

    const flags = type.flags;

    if ((flags & TypeFlags.Undefined) !== 0 || (flags & TypeFlags.Null) !== 0 || (flags & TypeFlags.Never) !== 0) {
      return {
        'hasCallable': false, 'hasData': false
      };
    }

    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
      return {
        'hasCallable': true, 'hasData': false
      };
    }

    return {
      'hasCallable': false, 'hasData': true
    };
  }

}
