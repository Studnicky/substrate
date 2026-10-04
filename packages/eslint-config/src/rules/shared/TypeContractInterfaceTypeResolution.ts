import {
  type ExpressionWithTypeArguments,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isFunctionTypeNode,
  isIdentifier,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isModuleBlock,
  isModuleDeclaration,
  isNamedTupleMember,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableStatement,
  ModifierFlags,
  type ModuleBlock,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type TypeElement,
  TypeFlags,
  type TypeLiteralNode,
  type TypeNode,
  type TypeOperatorNode,
  type TypeReferenceNode,
  type VariableStatement
} from 'typescript';

import type { TypeContractContextInterface } from './TypeContractContextInterface.js';
import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

import { ACCEPTED_SCHEMA_VALUE_NAMES } from './constants/SchemaDerivationConstants.js';
import { type InterfaceContractEvidenceInterface } from './InterfaceContractEvidenceInterface.js';
import { type InterfaceContractProbeInterface } from './InterfaceContractProbeInterface.js';
import { type InterfaceTypeResolutionInterface } from './InterfaceTypeResolutionInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';

export class TypeContractInterfaceTypeResolution implements InterfaceTypeResolutionInterface {
  public constructor(private readonly context: TypeContractContextInterface) {}

  public findInterfaceTypeContract(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'node': node, 'reason': 'nonJson'
      };
    }

    const terminalA = this.interfaceTypeContractTerminalA(node);

    if (terminalA.matched) {
      return terminalA.value;
    }

    const terminalB = this.interfaceTypeContractTerminalB(node, visiting, depth);

    if (terminalB.matched) {
      return terminalB.value;
    }

    if (isTypeReferenceNode(node)) {
      const result = this.interfaceTypeContractForReference(node, visiting, depth);

      return result;
    }

    const exclusiveComposite = this.interfaceTypeContractExclusiveComposite(node, visiting, depth);

    if (exclusiveComposite.matched) {
      return exclusiveComposite.value;
    }

    if (isTypeLiteralNode(node)) {
      const evidence = this.interfaceTypeContractInTypeLiteral(node, visiting, depth);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    const result = this.interfaceTypeContractFromResolvedType(node);

    return result;
  }

  private interfaceTypeContractTerminalA(node: TypeNode): InterfaceContractProbeInterface {
    if (isFunctionTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'callable' }
      };
    }
    if (isConstructorTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'constructor' }
      };
    }
    if (isConditionalTypeNode(node) || isMappedTypeNode(node) || isIndexedAccessTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'nonJson' }
      };
    }
    if (this.context.isUniqueSymbol(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'brand' }
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private interfaceTypeContractTerminalB(node: TypeNode, visiting: Set<Symbol>, depth: number): InterfaceContractProbeInterface {
    if (isTypeOperatorNode(node)) {
      const value = this.interfaceTypeContractForTypeOperator(node, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const value = this.findInterfaceTypeContract(node.type, visiting, depth + 1);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private interfaceTypeContractForTypeOperator(
    node: TypeOperatorNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (node.operator === SyntaxKind.ReadonlyKeyword) {
      return {
        'node': node, 'reason': 'readonly'
      };
    }
    if (node.operator === SyntaxKind.KeyOfKeyword) {
      return {
        'node': node, 'reason': 'nonJson'
      };
    }

    const result = this.findInterfaceTypeContract(node.type, visiting, depth + 1);

    return result;
  }

  private interfaceTypeContractExclusiveComposite(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractProbeInterface {
    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const value = this.interfaceTypeContractInMembers(node.types, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isTupleTypeNode(node)) {
      const elementTypes = node.elements.map((element) => {
        const elementType = isNamedTupleMember(element) ? element.type : element;

        return elementType;
      });
      const value = this.interfaceTypeContractInMembers(elementTypes, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isArrayTypeNode(node)) {
      const value = this.findInterfaceTypeContract(node.elementType, visiting, depth + 1);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private interfaceTypeContractInMembers(
    members: readonly TypeNode[],
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const evidence = this.findInterfaceTypeContract(member, visiting, depth + 1);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private interfaceTypeContractInTypeLiteral(
    node: TypeLiteralNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const members = node.members;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const evidence = this.interfaceTypeContractForTypeLiteralMember(member, visiting, depth);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  // D5: this nested `TypeLiteralNode` member loop (an inline object member's own type,
  // e.g. `interface X { nested: { toString(): string }; }`) previously had NO decoy check
  // at all for either builtin-shadow spelling — see `isBuiltinShadowMemberDecoy`'s doc
  // comment on the outer `findInterfaceContract`'s identical gap.
  private interfaceTypeContractForTypeLiteralMember(
    member: TypeElement,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (isCallSignatureDeclaration(member)) {
      return {
        'node': member, 'reason': 'callable'
      };
    }
    if (isMethodSignature(member)) {
      if (this.context.interfaceContract.isBuiltinShadowMemberDecoy(member)) {
        return undefined;
      }

      return {
        'node': member, 'reason': 'callable'
      };
    }
    if (isConstructSignatureDeclaration(member)) {
      return {
        'node': member, 'reason': 'constructor'
      };
    }
    if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
      const result = this.interfaceTypeContractForTypeLiteralDataMember(member, member.type, visiting, depth);

      return result;
    }

    return undefined;
  }

  private interfaceTypeContractForTypeLiteralDataMember(
    member: TypeElement,
    memberType: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (this.context.isBrandMember(member)) {
      return {
        'node': member, 'reason': 'brand'
      };
    }
    if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
      return {
        'node': member, 'reason': 'readonly'
      };
    }
    if (isPropertySignature(member) && this.context.interfaceContract.isBuiltinShadowMemberDecoy(member)) {
      return undefined;
    }

    const result = this.findInterfaceTypeContract(memberType, visiting, depth + 1);

    return result;
  }

  private isReadonlyIntrinsicReference(node: TypeReferenceNode): boolean {
    const result = this.context.isIntrinsic(node, 'Readonly') || this.context.isIntrinsic(node, 'ReadonlyArray');

    return result;
  }

  private interfaceTypeContractForReference(
    node: TypeReferenceNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (this.isReadonlyIntrinsicReference(node)) {
      return {
        'node': node, 'reason': 'readonly'
      };
    }
    if (this.context.isRuntimeType(node)) {
      return {
        'node': node, 'reason': 'classInstance'
      };
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    // A bare reference to the interface's own type parameter (`handler: Fn` where `Fn extends
    // () => void`) carries no contract evidence of its own — the evidence, if any, lives in the
    // parameter's declared constraint. Without this, a callable/readonly constraint laundered
    // through a type parameter escapes detection entirely, since a type parameter reference by
    // itself resolves to neither a callable nor a readonly TypeScript type.
    if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
      const result = this.interfaceTypeContractForTypeParameterConstraint(symbol, visiting, depth);

      return result;
    }

    if (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0) {
      return {
        'node': node, 'reason': 'classInstance'
      };
    }

    const interfaceEvidence = this.interfaceTypeContractFromInterfaceDeclarations(node, symbol, visiting, depth);

    if (interfaceEvidence !== undefined) {
      return interfaceEvidence;
    }

    const aliasEvidence = this.interfaceTypeContractFromAliasDeclaration(node, symbol, visiting, depth);

    if (aliasEvidence !== undefined) {
      return aliasEvidence;
    }

    const typeArguments = node.typeArguments ?? [];
    const result = this.interfaceTypeContractInMembers(typeArguments, visiting, depth);

    return result;
  }

  private interfaceTypeContractForTypeParameterConstraint(
    symbol: Symbol,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const constraint = this.context.typeParameterConstraintNode(symbol);

    if (constraint === undefined) {
      return undefined;
    }

    const result = this.findInterfaceTypeContract(constraint, visiting, depth + 1);

    return result;
  }

  private interfaceTypeContractFromInterfaceDeclarations(
    node: TypeReferenceNode,
    symbol: Symbol | undefined,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationsLength = declarations.length;

    for (let index = 0; index < declarationsLength; index++) {
      const declaration = declarations.at(index);

      if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
        continue;
      }

      const evidence = this.context.interfaceContract.findInterfaceContract(declaration, visiting, depth + 1);

      if (evidence !== undefined) {
        return {
          'node': node, 'reason': evidence.reason
        };
      }
    }

    return undefined;
  }

  private interfaceTypeContractFromAliasDeclaration(
    node: TypeReferenceNode,
    symbol: Symbol | undefined,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    const alias = this.context.aliasDeclarationForSymbol(symbol);

    if (alias === undefined || symbol === undefined || visiting.has(symbol)) {
      return undefined;
    }

    const readonlyOutput = this.context.dataNode.readonlyOutputForAlias(alias, new Set(), depth + 1);

    if (readonlyOutput.length > 0) {
      return {
        'node': node, 'reason': 'readonly'
      };
    }

    const nested = this.context.aliasResolution.classifyAlias(alias, visiting, depth + 1);

    if (nested.classification !== 'interfaceContract' && nested.classification !== 'typeFunction') {
      return undefined;
    }

    const result = this.interfaceTypeContractReasonForNestedAlias(node, nested.reason);

    return result;
  }

  private interfaceTypeContractReasonForNestedAlias(
    node: TypeReferenceNode,
    reason: TypeContractMetadataEntity.Type['aliasReason']
  ): InterfaceContractEvidenceInterface {
    if (reason === 'callable') {
      return {
        'node': node, 'reason': 'callable'
      };
    }
    if (reason === 'constructor') {
      return {
        'node': node, 'reason': 'constructor'
      };
    }
    if (reason === 'brand') {
      return {
        'node': node, 'reason': 'brand'
      };
    }
    if (reason === 'classInstance') {
      return {
        'node': node, 'reason': 'classInstance'
      };
    }

    return {
      'node': node, 'reason': 'nonJson'
    };
  }

  private static isNonJsonTypeFlags(flags: TypeFlags): boolean {
    const result = (flags & TypeFlags.Any) !== 0
      || (flags & TypeFlags.Unknown) !== 0
      || (flags & TypeFlags.ESSymbol) !== 0
      || (flags & TypeFlags.UniqueESSymbol) !== 0
      || (flags & TypeFlags.BigIntLike) !== 0
      || (flags & TypeFlags.Never) !== 0
      || (flags & TypeFlags.Void) !== 0
      || (flags & TypeFlags.Undefined) !== 0;

    return result;
  }

  private interfaceTypeContractFromResolvedType(node: TypeNode): InterfaceContractEvidenceInterface | undefined {
    const type = this.context.checker.getTypeFromTypeNode(node);
    const typeSymbol = this.context.resolveSymbol(type.aliasSymbol ?? type.getSymbol());

    if (typeSymbol !== undefined && (typeSymbol.flags & SymbolFlags.Class) !== 0) {
      return {
        'node': node, 'reason': 'classInstance'
      };
    }

    if (TypeContractInterfaceTypeResolution.isNonJsonTypeFlags(type.flags)) {
      return {
        'node': node, 'reason': 'nonJson'
      };
    }

    return undefined;
  }

  public isSchemaDerivedHeritageType(node: ExpressionWithTypeArguments): boolean {
    const typeArguments = node.typeArguments;

    if (typeArguments === undefined) {
      return false;
    }
    const valueQuery = typeArguments.find(isTypeQueryNode);

    if (valueQuery === undefined) {
      return false;
    }

    const result = this.context.isSchemaDerivedShape({
      'derivingNameNode': node.expression, 'valueQuery': valueQuery
    });

    return result;
  }

  /**
   * True for the interface spelling of a canonical schema-derived entity type:
   * `export interface Type extends FromSchema<typeof Schema> {}`, declared directly inside a
   * module block whose enclosing namespace is named `*Entity` and which owns a sibling exported
   * `Schema` const. Commit 04083ad added `all-types-are-entities`' recognition of exactly this
   * shape (as the interface-heritage counterpart to `type Type = FromSchema<typeof Schema>`) —
   * this method is the single shared definition of that pattern, consulted by both
   * `all-types-are-entities` (which accepts it) and `interface-must-be-contract` (its only other
   * caller, which exempts it) so the two rules cannot re-diverge on what counts as "the entity
   * interface pattern."
   *
   * D3 (see the eslint-config objectives) — PAIRED RULE `interface-must-be-contract`: that rule
   * visits every `TSInterfaceDeclaration` and rejects any that is not `analyzeInterface(...)
   * .classification === 'contract'`. A schema-derived `Type` interface is `pureData` BY
   * CONSTRUCTION (see `classifyInterface` — it has heritage evidence, not a method/brand/
   * readonly/callable member, so `findInterfaceContract` finds no contract evidence and
   * `classifyInterface` falls to `pureData`), so without this exemption
   * `interface-must-be-contract` unconditionally rejected the exact shape `all-types-are-entities`
   * was taught to recognize as canonical — no author could satisfy both rules on the same
   * declaration. VERIFIED via `npx eslint` probe (ZzP4 prefix):
   *
   *   namespace FooEntity {
   *     export const Schema = { ... } as const satisfies JSONSchema;
   *     export interface Type extends FromSchema<typeof Schema> {}
   *   }
   *
   * was flagged by `interface-must-be-contract` ("contains only pure data") while accepted by
   * `all-types-are-entities`, on the same declaration, before this method existed. Fixed on
   * `interface-must-be-contract`'s side (per the objectives' stated preference) rather than by
   * widening `classifyInterface`'s own `analyzeInterface` classification — that keeps this
   * exemption's blast radius to exactly the one rule with the proven contradiction, and preserves
   * `analyzeInterface`'s existing `pureData` classification (and every OTHER rule that reads it,
   * e.g. `interfaces-compose-named-types`'s "skip pure-data interfaces entirely" early return)
   * completely unaffected.
   *
   * KNOWN UNRESOLVED CONFLICT (not fixable within this rule's scope; do not edit
   * `eslint.config.mjs`): `@typescript-eslint/naming-convention` requires every interface name to
   * match `/Interface$/u`, while this exact pattern requires the literal name `Type`. An author
   * following both `all-types-are-entities` and `naming-convention` cannot name the interface
   * `Type` without also failing `naming-convention` — REPORTED, not resolved.
   */
  private canonicalEntityExtendedType(declaration: InterfaceDeclaration): ExpressionWithTypeArguments | undefined {
    const extendsClause = (declaration.heritageClauses ?? []).find((clause) => {
      const result = clause.token === SyntaxKind.ExtendsKeyword;

      return result;
    });

    if (extendsClause?.types.length !== 1) {
      return undefined;
    }
    const [extendedType] = extendsClause.types;

    return extendedType;
  }

  private canonicalEntityInterfaceSchemaSymbol(declaration: InterfaceDeclaration): Symbol | undefined {
    const extendedType = this.canonicalEntityExtendedType(declaration);
    const schemaArgument = extendedType?.typeArguments?.at(0);

    if (
      extendedType === undefined
      || schemaArgument === undefined
      || !isTypeQueryNode(schemaArgument)
      || !isIdentifier(schemaArgument.exprName)
      || !this.context.isCanonicalFromSchemaReference(extendedType.expression)
    ) {
      return undefined;
    }

    const result = this.context.checker.getSymbolAtLocation(schemaArgument.exprName);

    return result;
  }

  private static statementHasExportModifier(statement: VariableStatement): boolean {
    const modifiers = statement.modifiers;

    if (modifiers === undefined) {
      return false;
    }

    const result = modifiers.some((modifier) => {
      const isExport = modifier.kind === SyntaxKind.ExportKeyword;

      return isExport;
    });

    return result;
  }

  private variableStatementDeclaresSchemaSymbol(statement: VariableStatement, schemaSymbol: Symbol): boolean {
    const declarations = statement.declarationList.declarations;
    const declarationCount = declarations.length;

    for (let declarationIndex = 0; declarationIndex < declarationCount; declarationIndex += 1) {
      const schemaDeclaration = declarations.at(declarationIndex);

      if (schemaDeclaration !== undefined
        && isIdentifier(schemaDeclaration.name)
        && ACCEPTED_SCHEMA_VALUE_NAMES.has(schemaDeclaration.name.text)
        && this.context.checker.getSymbolAtLocation(schemaDeclaration.name) === schemaSymbol) {
        return true;
      }
    }

    return false;
  }

  private moduleBlockOwnsExportedSchema(namespaceBlock: ModuleBlock, schemaSymbol: Symbol): boolean {
    const statementCount = namespaceBlock.statements.length;

    for (let statementIndex = 0; statementIndex < statementCount; statementIndex += 1) {
      const statement = namespaceBlock.statements.at(statementIndex);

      if (statement === undefined || !isVariableStatement(statement)) {
        continue;
      }

      if (!TypeContractInterfaceTypeResolution.statementHasExportModifier(statement)) {
        continue;
      }

      if (this.variableStatementDeclaresSchemaSymbol(statement, schemaSymbol)) {
        return true;
      }
    }

    return false;
  }

  public isCanonicalEntityInterface(declaration: InterfaceDeclaration): boolean {
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

    const schemaSymbol = this.canonicalEntityInterfaceSchemaSymbol(declaration);

    if (schemaSymbol === undefined) {
      return false;
    }

    if (!this.moduleBlockOwnsExportedSchema(namespaceBlock, schemaSymbol)) {
      return false;
    }

    const namespaceDeclaration = namespaceBlock.parent;

    const result = isModuleDeclaration(namespaceDeclaration)
      && isIdentifier(namespaceDeclaration.name)
      && namespaceDeclaration.name.text.endsWith('Entity');

    return result;
  }

}
