import {
  type ExpressionWithTypeArguments,
  getCombinedModifierFlags,
  type HeritageClause,
  type InterfaceDeclaration,
  isCallSignatureDeclaration,
  isConstructSignatureDeclaration,
  isFunctionTypeNode,
  isIdentifier,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isMethodSignature,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeOperatorNode,
  isTypeReferenceNode,
  type MethodSignature,
  ModifierFlags,
  type PropertySignature,
  type Symbol,
  SyntaxKind,
  type TypeElement,
  type TypeNode,
  type TypeReferenceNode
} from 'typescript';

import type { TypeContractContextInterface } from './TypeContractContextInterface.js';

import { type InterfaceClassificationResultInterface } from './InterfaceClassificationResultInterface.js';
import { type InterfaceContractEvidenceInterface } from './InterfaceContractEvidenceInterface.js';
import { type InterfaceContractProbeInterface } from './InterfaceContractProbeInterface.js';
import { type InterfaceContractResolutionInterface } from './InterfaceContractResolutionInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';

export class TypeContractInterfaceContractResolution implements InterfaceContractResolutionInterface {
  public constructor(private readonly context: TypeContractContextInterface) {}

  private hasSchemaAnchoredMember(declaration: InterfaceDeclaration, depth: number): boolean {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return false;
    }

    if (this.heritageHasSchemaDerivedType(declaration)) {
      return true;
    }

    const result = this.membersHaveSchemaAnchoredProperty(declaration, depth);

    return result;
  }

  private heritageHasSchemaDerivedType(declaration: InterfaceDeclaration): boolean {
    const heritageClauses = declaration.heritageClauses ?? [];
    const heritageLength = heritageClauses.length;

    for (let index = 0; index < heritageLength; index++) {
      const clause = heritageClauses.at(index);

      if (clause === undefined) {
        continue;
      }
      const types = clause.types;
      const typesLength = types.length;

      for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
        const type = types.at(typeIndex);

        if (type !== undefined && this.context.interfaceType.isSchemaDerivedHeritageType(type)) {
          return true;
        }
      }
    }

    return false;
  }

  private membersHaveSchemaAnchoredProperty(declaration: InterfaceDeclaration, depth: number): boolean {
    const members = declaration.members;
    const memberCount = members.length;

    for (let index = 0; index < memberCount; index++) {
      const member = members.at(index);

      if (member !== undefined && isPropertySignature(member) && member.type !== undefined
        && this.isSchemaAnchoredPropertyType(member.type, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  private isSchemaAnchoredPropertyType(node: TypeNode, depth: number): boolean {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return false;
    }
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = this.isSchemaAnchoredPropertyType(node.type, depth + 1);

      return result;
    }
    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = this.isSchemaAnchoredPropertyType(node.type, depth + 1);

      return result;
    }
    if (this.context.isSchemaDerivedApplication(node)) {
      return true;
    }
    if (!isTypeReferenceNode(node)) {
      return false;
    }

    // `Extract<SomeEntity.Type, 'literal'>`, `Readonly<SomeEntity.Type>`, and similar wrappers
    // carry the schema-derived reference as a type argument rather than as the reference itself.
    if (this.typeArgumentsHaveSchemaAnchor(node.typeArguments, depth)) {
      return true;
    }

    const result = this.referenceDeclarationIsSchemaAnchored(node, depth);

    return result;
  }

  private typeArgumentsHaveSchemaAnchor(typeArguments: readonly TypeNode[] | undefined, depth: number): boolean {
    if (typeArguments === undefined) {
      return false;
    }

    const argumentCount = typeArguments.length;

    for (let index = 0; index < argumentCount; index++) {
      const argument = typeArguments.at(index);

      if (argument !== undefined && this.isSchemaAnchoredPropertyType(argument, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  // A bare named reference, e.g. `SomeEntity.Type` — resolve to its declaring alias/interface
  // and check whether THAT declaration is itself schema-derived.
  private referenceDeclarationIsSchemaAnchored(node: TypeReferenceNode, depth: number): boolean {
    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index++) {
      const declaration = declarations.at(index);

      if (declaration === undefined) {
        continue;
      }
      if (isTypeAliasDeclaration(declaration) && this.context.isSchemaDerivedApplication(declaration.type)) {
        return true;
      }
      if (isInterfaceDeclaration(declaration) && this.hasSchemaAnchoredMember(declaration, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  public isDataContractInterfaceReference(node: TypeNode, visiting: Set<Symbol>, depth: number): boolean {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return false;
    }
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = this.isDataContractInterfaceReference(node.type, visiting, depth + 1);

      return result;
    }
    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = this.isDataContractInterfaceReference(node.type, visiting, depth + 1);

      return result;
    }
    if (!isTypeReferenceNode(node)) {
      return false;
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));
    const interfaceDeclaration = this.context.interfaceDeclarationForSymbol(symbol);

    if (interfaceDeclaration === undefined) {
      return false;
    }

    const result = this.isReadonlyDataContractInterface(interfaceDeclaration, visiting, depth);

    return result;
  }

  private isReadonlyDataContractInterface(interfaceDeclaration: InterfaceDeclaration, visiting: Set<Symbol>, depth: number): boolean {
    const classified = this.classifyInterface(interfaceDeclaration, visiting, depth + 1);

    if (classified.classification !== 'contract') {
      return false;
    }
    if (!this.hasSchemaAnchoredMember(interfaceDeclaration, depth + 1)) {
      return false;
    }

    const result = classified.reason === 'readonly';

    return result;
  }

  public interfaceHasCallSignature(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): boolean {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return false;
    }

    const hasOwnSignature = declaration.members.some((member) => {
      const result = isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member);

      return result;
    });

    if (hasOwnSignature) {
      return true;
    }

    const symbol = this.context.checker.getSymbolAtLocation(declaration.name);

    if (symbol !== undefined && visiting.has(symbol)) {
      return false;
    }
    const nextVisiting = new Set(visiting);

    if (symbol !== undefined) {
      nextVisiting.add(symbol);
    }

    const result = this.heritageInterfaceHasCallSignature(declaration, nextVisiting, depth);

    return result;
  }

  private heritageInterfaceHasCallSignature(declaration: InterfaceDeclaration, visiting: Set<Symbol>, depth: number): boolean {
    const heritageClauses = declaration.heritageClauses ?? [];
    const heritageLength = heritageClauses.length;

    for (let index = 0; index < heritageLength; index++) {
      const clause = heritageClauses.at(index);

      if (clause === undefined) {
        continue;
      }
      if (this.heritageClauseHasCallSignature(clause, visiting, depth)) {
        return true;
      }
    }

    return false;
  }

  private heritageClauseHasCallSignature(clause: HeritageClause, visiting: Set<Symbol>, depth: number): boolean {
    const types = clause.types;
    const typesLength = types.length;

    for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
      const type = types.at(typeIndex);

      if (type === undefined) {
        continue;
      }
      const resolved = this.context.checker.getTypeAtLocation(type);
      const typeSymbol = this.context.resolveSymbol(resolved.aliasSymbol ?? resolved.getSymbol());
      const inheritedDeclarations = typeSymbol?.getDeclarations() ?? [];
      const inherited = inheritedDeclarations.find(isInterfaceDeclaration);

      if (inherited !== undefined && this.interfaceHasCallSignature(inherited, visiting, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  public classifyInterface(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceClassificationResultInterface {
    const evidence = this.findInterfaceContract(declaration, visiting, depth);

    // The annotation is load-bearing: without it the object literals lose the
    // contextual typing they had in return position, `'contract'` widens to
    // `string`, and this no longer satisfies the declared return type.
    const result: InterfaceClassificationResultInterface = evidence === undefined
      ? {
        'classification': 'pureData',
        'evidence': declaration,
        'reason': 'pureData'
      }
      : {
        'classification': 'contract',
        'evidence': evidence.node,
        'reason': evidence.reason
      };

    return result;
  }

  public findInterfaceContract(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'node': declaration, 'reason': 'nonJson'
      };
    }

    const symbol = this.context.checker.getSymbolAtLocation(declaration.name);

    if (symbol !== undefined && visiting.has(symbol)) {
      return undefined;
    }
    const nextVisiting = new Set(visiting);

    if (symbol !== undefined) {
      nextVisiting.add(symbol);
    }

    const members = declaration.members;
    const mutableDataMemberCount = this.interfaceMutableDataMemberCount(members, nextVisiting, depth);
    const readonlyEvidenceGated = mutableDataMemberCount >= 3;
    const memberEvidence = this.findInterfaceContractInMembers(members, nextVisiting, depth, readonlyEvidenceGated);

    if (memberEvidence !== undefined) {
      return memberEvidence;
    }

    const result = this.findInterfaceContractInHeritage(declaration, nextVisiting, depth);

    return result;
  }

  // Heuristic gate against a lone `readonly` decoy: a single readonly property bolted onto an
  // otherwise plain-mutable-data interface is a common way to game this rule into treating the
  // whole interface as a runtime contract. Genuine immutability contracts mark every property
  // readonly, not just one. This is a deliberate, documented compromise between false positives
  // (a legitimately single-readonly-field contract) and false negatives (the gamed decoy) — once
  // 3 or more sibling properties are plain mutable data, a single readonly property alone no
  // longer counts as sufficient contract evidence on its own; a genuine method, a real
  // call/construct signature, or making every property readonly still does.
  private interfaceMutableDataMemberCount(members: readonly TypeElement[], visiting: Set<Symbol>, depth: number): number {
    const length = members.length;
    let mutableDataMemberCount = 0;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const isMutableDataCandidate = (isPropertySignature(member) || isIndexSignatureDeclaration(member))
        && (getCombinedModifierFlags(member) & ModifierFlags.Readonly) === 0
        && member.type !== undefined
        && !this.context.isBrandMember(member)
        && this.context.interfaceType.findInterfaceTypeContract(member.type, visiting, depth + 1) === undefined;

      if (isMutableDataCandidate) {
        mutableDataMemberCount++;
      }
    }

    return mutableDataMemberCount;
  }

  private findInterfaceContractInMembers(
    members: readonly TypeElement[],
    visiting: Set<Symbol>,
    depth: number,
    readonlyEvidenceGated: boolean
  ): InterfaceContractEvidenceInterface | undefined {
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const evidence = this.findInterfaceContractForMember(member, visiting, depth, readonlyEvidenceGated);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private findInterfaceContractForMember(
    member: TypeElement,
    visiting: Set<Symbol>,
    depth: number,
    readonlyEvidenceGated: boolean
  ): InterfaceContractEvidenceInterface | undefined {
    const signatureEvidence = this.findInterfaceContractForSignatureMember(member);

    if (signatureEvidence.matched) {
      return signatureEvidence.value;
    }

    if (this.context.isBrandMember(member)) {
      return {
        'node': member, 'reason': 'brand'
      };
    }

    const result = this.findInterfaceContractForDataMember(member, visiting, depth, readonlyEvidenceGated);

    return result;
  }

  private findInterfaceContractForSignatureMember(member: TypeElement): InterfaceContractProbeInterface {
    if (isCallSignatureDeclaration(member)) {
      return {
        'matched': true, 'value': { 'node': member, 'reason': 'callable' }
      };
    }
    // A method named exactly `toString`/`valueOf` with no parameters mimics the builtin
    // `Object.prototype` shadow shape — a one-liner decoy commonly bolted onto an otherwise
    // pure-data interface to silence this rule. Excluding only this literal shape (not methods
    // generally) keeps genuinely callable interfaces flagged as contracts while closing the
    // specific gaming pattern; any other method name, or either of these two names with
    // parameters, remains ordinary — and sufficient — contract evidence.
    if (isMethodSignature(member)) {
      const value = this.isBuiltinShadowMemberDecoy(member)
        ? undefined
        : { 'node': member, 'reason': 'callable' as const };

      return {
        'matched': true, 'value': value
      };
    }
    if (isConstructSignatureDeclaration(member)) {
      return {
        'matched': true, 'value': { 'node': member, 'reason': 'constructor' }
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private findInterfaceContractForDataMember(
    member: TypeElement,
    visiting: Set<Symbol>,
    depth: number,
    readonlyEvidenceGated: boolean
  ): InterfaceContractEvidenceInterface | undefined {
    const isReadonlyMember = (isPropertySignature(member) || isIndexSignatureDeclaration(member))
      && (getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0;

    if (isReadonlyMember && !readonlyEvidenceGated) {
      return {
        'node': member, 'reason': 'readonly'
      };
    }

    // D5: the property-shorthand spelling of the same builtin-shadow decoy
    // (`'toString': () => string;`) — see `isBuiltinShadowMemberDecoy`'s doc comment.
    if (isPropertySignature(member) && this.isBuiltinShadowMemberDecoy(member)) {
      return undefined;
    }

    if (
      (isPropertySignature(member) || isIndexSignatureDeclaration(member))
      && member.type !== undefined
    ) {
      const result = this.context.interfaceType.findInterfaceTypeContract(member.type, visiting, depth + 1);

      return result;
    }

    return undefined;
  }

  private findInterfaceContractInHeritage(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const heritageClauses = declaration.heritageClauses ?? [];
    const heritageLength = heritageClauses.length;

    for (let index = 0; index < heritageLength; index++) {
      const clause = heritageClauses.at(index);

      if (clause === undefined) {
        continue;
      }
      const evidence = this.findInterfaceContractInHeritageClause(clause, visiting, depth);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private findInterfaceContractInHeritageClause(
    clause: HeritageClause,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const types = clause.types;
    const typesLength = types.length;

    for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
      const type = types.at(typeIndex);

      if (type === undefined) {
        continue;
      }
      const evidence = this.findInterfaceContractForHeritageType(type, visiting, depth);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private findInterfaceContractForHeritageType(
    type: ExpressionWithTypeArguments,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const resolved = this.context.checker.getTypeAtLocation(type);
    const typeSymbol = this.context.resolveSymbol(resolved.aliasSymbol ?? resolved.getSymbol());
    const declarations = typeSymbol?.getDeclarations() ?? [];
    const inherited = declarations.find(isInterfaceDeclaration);

    if (inherited !== undefined) {
      const evidence = this.findInterfaceContract(inherited, visiting, depth + 1);

      if (evidence === undefined) {
        return undefined;
      }

      return {
        'node': type, 'reason': evidence.reason
      };
    }

    // A heritage clause naming a type alias (`interface X extends SomeAlias {}`) carries
    // contract evidence just as an interface heritage clause does — `SomeAlias` might itself
    // resolve to a callable, constructable, branded, or readonly object type. Only
    // `isInterfaceDeclaration` heritage was previously followed, silently dropping every
    // alias-typed heritage clause's contract evidence.
    const aliasDeclaration = declarations.find(isTypeAliasDeclaration);

    if (aliasDeclaration === undefined) {
      return undefined;
    }

    const evidence = this.context.interfaceType.findInterfaceTypeContract(aliasDeclaration.type, visiting, depth + 1);

    if (evidence === undefined) {
      return undefined;
    }

    return {
      'node': type, 'reason': evidence.reason
    };
  }

  /**
   * The specific `toString(): string` / `valueOf(): T` builtin-shadow shape used as a gaming
   * decoy — see {@link findInterfaceContract}'s readonly-gate comment for the fuller rationale.
   * Named exactly `toString`/`valueOf` with no parameters, spelled either as a method
   * (`toString(): string;`) or as a property whose VALUE is itself a zero-parameter function
   * type (`'toString': () => string;`) — the two are the same decoy shape via different syntax.
   *
   * D5 (see the eslint-config objectives): this check previously existed only inside
   * `findInterfaceContract`'s `isMethodSignature` branch, gating the method-shorthand spelling.
   * The property-shorthand spelling was ungated: a `PropertySignature` member's `.type` (a
   * `FunctionTypeNode`) is handed to `findInterfaceTypeContract`, whose `FunctionTypeNode` branch
   * returns unconditional `'callable'` contract evidence with no decoy check at all. VERIFIED via
   * `npx eslint` probe (ZzP4 prefix): `export interface XInterface { 'toString': () => string;
   * }` — no other member — produced ZERO errors (classified `contract`, never `pureData`),
   * closing off `interface-must-be-contract` entirely with the exact one-liner the method-form
   * check was built to stop. Extracted here as the single shared check BOTH `findInterfaceContract`
   * (the interface's own top-level member loop) and `findInterfaceTypeContract`'s nested
   * `TypeLiteralNode` member loop (the analogous decoy nested inside an inline object member's
   * own type, e.g. `interface X { nested: { toString(): string }; }`) call, so a future change to
   * the decoy shape cannot update one call site and silently miss the other.
   */
  public isBuiltinShadowMemberDecoy(member: MethodSignature | PropertySignature): boolean {
    const name = member.name;

    // `'toString'` (a quoted string-literal key) is the SAME decoy as an unquoted `toString`
    // identifier key — TypeScript represents the two with different `.name` node kinds
    // (`StringLiteral` vs `Identifier`) even though they name the identical property at runtime.
    // Checking `isIdentifier` alone missed the quoted spelling entirely: VERIFIED via `npx eslint`
    // probe, `'toString': () => string;` still escaped after the first pass of this fix, until
    // `isStringLiteral` was recognized here too.
    const text = isIdentifier(name) || isStringLiteral(name) ? name.text : undefined;

    if (text !== 'toString' && text !== 'valueOf') {
      return false;
    }

    if (isMethodSignature(member)) {
      const result = member.parameters.length === 0;

      return result;
    }

    const value = member.type;

    const result = value !== undefined && isFunctionTypeNode(value) && value.parameters.length === 0;

    return result;
  }

}
