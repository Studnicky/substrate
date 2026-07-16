import type { JSSyntaxElement, Rule } from 'eslint';

import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';
import path from 'node:path';
import {
  getCombinedModifierFlags,
  ModifierFlags,
  type Program,
  type Symbol,
  SymbolFlags,
  type Type,
  type TypeChecker,
  TypeFlags,
  type TypeReference
} from 'typescript';


/**
 * type-alias-invariants — merges five independent type-alias/interface checks into
 * one shared `TSTypeAliasDeclaration` / `TSInterfaceDeclaration` visitor:
 *
 * 1. mustEndType — exported type aliases must end in `Type`.
 * 2. noReadonly — exported data-type aliases must not bake in `readonly` (autofix).
 * 3. noAliasing — disallow naked type re-aliases and import aliases.
 * 4. derivedFromSchema — disallow inline object-literal type aliases outside `entities/`.
 * 5. noPreferExisting — disallow locally-declared object types/interfaces whose shape
 *    already exists in an imported package.
 *
 * Each check is independently toggleable via options and reports its own messageId,
 * exactly matching the behavior of the five source rules it replaces.
 */

type SeverityType = 'error' | 'off' | 'warn';

/**
 * The single source of truth for this rule's options shape — also used verbatim as
 * `meta.schema[0]` below. `OptionsType` is derived FROM this schema via `FromSchema`
 * rather than hand-declared as a separate parallel type, so there is exactly one
 * definition of the shape (matching this rule's own `noPreferExisting`/`derivedFromSchema`
 * checks: don't redeclare a shape that already exists elsewhere).
 */
const OPTIONS_SCHEMA = {
  'additionalProperties': false,
  'properties': {
    'derivedFromSchema': { 'default': true, 'type': 'boolean' },
    'mustEndType': { 'default': true, 'type': 'boolean' },
    'noAliasing': { 'default': true, 'type': 'boolean' },
    'noPreferExisting': {
      'oneOf': [
        { 'type': 'boolean' },
        {
          'additionalProperties': false,
          'properties': {
            'exactMatch': { 'enum': ['error', 'off', 'warn'], 'type': 'string' },
            'excludePrefixes': {
              'items': { 'type': 'string' },
              'type': 'array'
            },
            'minFields': { 'minimum': 0, 'type': 'integer' },
            'nearMatch': { 'enum': ['error', 'off', 'warn'], 'type': 'string' },
            'subsumedMatch': { 'enum': ['error', 'off', 'warn'], 'type': 'string' }
          },
          'type': 'object'
        }
      ]
    },
    'noReadonly': { 'default': true, 'type': 'boolean' }
  },
  'type': 'object'
} as const satisfies JsonSchemaObjectType;

type OptionsType = FromSchema<typeof OPTIONS_SCHEMA>;
type NoPreferExistingOptionsType = Exclude<OptionsType['noPreferExisting'], boolean | undefined>;

type ResolvedNoPreferExistingOptionsType = {
  readonly 'enabled': boolean;
  readonly 'exactMatch': SeverityType;
  readonly 'excludePrefixes': readonly string[];
  readonly 'minFields': number;
  readonly 'nearMatch': SeverityType;
  readonly 'subsumedMatch': SeverityType;
};

const DEFAULT_NO_PREFER_EXISTING: ResolvedNoPreferExistingOptionsType = {
  'enabled': true,
  'exactMatch': 'error',
  'excludePrefixes': ['@types/', 'node:'],
  'minFields': 2,
  'nearMatch': 'warn',
  'subsumedMatch': 'warn'
};

class OptionsResolution {
  public static resolveNoPreferExisting(raw: boolean | NoPreferExistingOptionsType | undefined): ResolvedNoPreferExistingOptionsType {
    if (raw === false) {
      return { ...DEFAULT_NO_PREFER_EXISTING, 'enabled': false };
    }
    if (raw === undefined || raw === true) {
      return DEFAULT_NO_PREFER_EXISTING;
    }

    return {
      'enabled': true,
      'exactMatch': raw.exactMatch ?? DEFAULT_NO_PREFER_EXISTING.exactMatch,
      'excludePrefixes': raw.excludePrefixes ?? DEFAULT_NO_PREFER_EXISTING.excludePrefixes,
      'minFields': raw.minFields ?? DEFAULT_NO_PREFER_EXISTING.minFields,
      'nearMatch': raw.nearMatch ?? DEFAULT_NO_PREFER_EXISTING.nearMatch,
      'subsumedMatch': raw.subsumedMatch ?? DEFAULT_NO_PREFER_EXISTING.subsumedMatch
    };
  }

  public static resolve(context: Rule.RuleContext) {
    const optionsArray = context.options as unknown[] | undefined;
    const raw = Array.isArray(optionsArray) ? (optionsArray.at(0) as OptionsType | undefined) : undefined;

    return {
      'derivedFromSchema': raw?.derivedFromSchema ?? true,
      'mustEndType': raw?.mustEndType ?? true,
      'noAliasing': raw?.noAliasing ?? true,
      'noPreferExisting': OptionsResolution.resolveNoPreferExisting(raw?.noPreferExisting),
      'noReadonly': raw?.noReadonly ?? true
    };
  }
}

// ---------------------------------------------------------------------------
// Shared AST helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Check 1: mustEndType — exported type aliases must end in `Type`.
// ---------------------------------------------------------------------------

// json-schema-uninexpressible: raw ESLint/TS AST-node shape used only to narrow an untyped Rule.Node, never serialized
// json-schema-uninexpressible: ad-hoc narrowed view into an ExportSpecifier AST node's shape — the real
// authority for this shape is the parser (@typescript-eslint/parser), not a domain shape this package
// owns or defines; used for a single unsafe cast, never serialized or ajv-validated as data
type ExportSpecifierNodeType = {
  readonly 'exportKind'?: string;
  readonly 'local': { readonly 'name': string };
};

type ProgramExportNodeType = JSSyntaxElement & {
  readonly 'declaration'?: unknown;
  readonly 'exportKind'?: string;
  readonly 'source'?: unknown;
  readonly 'specifiers'?: ExportSpecifierNodeType[];
};

/**
 * Names re-exported as a type via a separate, non-declaring `export { ... }` specifier list,
 * scanned once per file and cached — `MustEndTypeCheck.run` is called once per top-level type
 * alias, and re-scanning the whole `Program` body per alias would make this O(aliases × body
 * length) instead of O(body length).
 */
class ReexportedTypeNames {
  private static readonly cache = new WeakMap<object, ReadonlySet<string>>();

  public static collect(context: Rule.RuleContext): ReadonlySet<string> {
    const program = context.sourceCode.ast as unknown as { 'body': ProgramExportNodeType[] };
    const cached = ReexportedTypeNames.cache.get(program);
    if (cached !== undefined) { return cached; }

    const names = new Set<string>();
    program.body.forEach((statement) => {
      if (statement.type !== 'ExportNamedDeclaration') { return; }
      if (statement.declaration !== null && statement.declaration !== undefined) { return; }
      if (statement.source !== null && statement.source !== undefined) { return; }

      (statement.specifiers ?? []).forEach((specifier) => {
        if (statement.exportKind === 'type' || specifier.exportKind === 'type') {
          names.add(specifier.local.name);
        }
      });
    });

    ReexportedTypeNames.cache.set(program, names);
    return names;
  }
}

class MustEndTypeCheck {
  public static run(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode = node as unknown as {
      'id': { 'name': string };
      'parent': { 'type': string };
    };

    const isInlineExport = rawNode.parent.type === 'ExportNamedDeclaration';
    const isSeparateReexport =
      rawNode.parent.type === 'Program' && ReexportedTypeNames.collect(context).has(rawNode.id.name);

    if (!isInlineExport && !isSeparateReexport) { return; }
    if (rawNode.id.name.endsWith('Type')) { return; }

    context.report({
      'data': { 'name': rawNode.id.name },
      'messageId': 'mustEndType',
      'node': node
    });
  }
}

// ---------------------------------------------------------------------------
// Check 2: noReadonly — exported data-type aliases must not bake in `readonly`.
// ---------------------------------------------------------------------------

// json-schema-uninexpressible: 'id' is typed as bare `object & {...}` — TS's structural `object` type has
// no JSON Schema equivalent (it means "any non-primitive," not a defined shape); also an ad-hoc narrowed
// view into a TSTypeAliasDeclaration AST node, not a domain shape this package owns
type AliasNodeType = {
  readonly 'id': object & { readonly 'name': string };
  readonly 'parent': { readonly 'type': string };
};

// json-schema-uninexpressible: ad-hoc narrowed view into an ExportSpecifier AST node's shape — the real
// authority for this shape is the parser, not a domain shape this package owns; never serialized
type ExportSpecifierType = {
  readonly 'local': { readonly 'name': string };
};

// json-schema-uninexpressible: 'source' is typed `unknown` (deliberately, since it's either absent or an
// AST node whose exact shape isn't narrowed here) — `unknown` has no JSON Schema equivalent
type ExportNamedDeclarationNodeType = {
  readonly 'source'?: unknown;
  readonly 'specifiers'?: readonly ExportSpecifierType[];
};

type ParserServicesType = {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
};

// json-schema-uninexpressible: wraps ParserServicesType, whose members (getSymbolAtLocation,
// getTypeAtLocation) are function-typed — function types have no JSON Schema equivalent
type SourceCodeServicesAccessorType = {
  readonly 'parserServices'?: ParserServicesType;
};

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesType | undefined {
    const result = (context.sourceCode as unknown as SourceCodeServicesAccessorType).parserServices;
    return result;
  }
}

class ReadonlyDetection {
  public static isInlineStructural(checker: TypeChecker, t: Type): boolean {
    if (t.aliasSymbol !== undefined) { return false; }
    if (checker.isArrayType(t) || checker.isTupleType(t)) { return true; }
    if (t.isUnionOrIntersection()) { return true; }
    const s = t.getSymbol();
    return s?.getName() === '__type';
  }

  private static readonly MAX_DEPTH = 200;

  public static bakesReadonly(checker: TypeChecker, type: Type, visited: Set<Type>, depth = 0): boolean {
    if (depth > ReadonlyDetection.MAX_DEPTH) { return false; }
    if (visited.has(type)) { return false; }
    visited.add(type);

    if (type.isUnionOrIntersection()) {
      const unionTypes = type.types;
      const len = unionTypes.length;
      for (let i = 0; i < len; i++) {
        if (ReadonlyDetection.bakesReadonly(checker, unionTypes[i]!, visited, depth + 1)) { return true; }
      }
      return false;
    }

    if (checker.isArrayType(type)) {
      const indexInfos = checker.getIndexInfosOfType(type);
      const iiLen = indexInfos.length;
      for (let i = 0; i < iiLen; i++) {
        if (indexInfos[i]!.isReadonly) { return true; }
      }
      const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
      const taLen = typeArgs.length;
      for (let i = 0; i < taLen; i++) {
        const a = typeArgs[i]!;
        if (ReadonlyDetection.isInlineStructural(checker, a) && ReadonlyDetection.bakesReadonly(checker, a, visited, depth + 1)) { return true; }
      }
      return false;
    }

    if (checker.isTupleType(type)) {
      const tupleTarget = type as unknown as { readonly 'target': { readonly 'readonly': boolean } };
      if (tupleTarget.target.readonly) { return true; }
      const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
      const taLen = typeArgs.length;
      for (let i = 0; i < taLen; i++) {
        const a = typeArgs[i]!;
        if (ReadonlyDetection.isInlineStructural(checker, a) && ReadonlyDetection.bakesReadonly(checker, a, visited, depth + 1)) { return true; }
      }
      return false;
    }

    const indexInfos = checker.getIndexInfosOfType(type);
    const iiLen = indexInfos.length;
    for (let i = 0; i < iiLen; i++) {
      if (indexInfos[i]!.isReadonly) { return true; }
    }

    const props = type.getProperties();
    const propsLen = props.length;
    for (let i = 0; i < propsLen; i++) {
      const p = props[i]!;
      if (p.valueDeclaration !== undefined) {
        if ((getCombinedModifierFlags(p.valueDeclaration) & ModifierFlags.Readonly) !== 0) {
          return true;
        }
        const pt = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration);
        if (ReadonlyDetection.isInlineStructural(checker, pt) && ReadonlyDetection.bakesReadonly(checker, pt, visited, depth + 1)) { return true; }
      }
    }

    return false;
  }

  public static isReadonlyOffender(obj: Record<string, unknown>): boolean {
    const nodeType = obj.type;
    const readonlyProp = obj.readonly;
    const operatorProp = obj.operator;

    if (nodeType === 'TSPropertySignature') { return readonlyProp === true; }
    if (nodeType === 'TSIndexSignature') { return readonlyProp === true; }
    if (nodeType === 'TSTypeOperator') { return operatorProp === 'readonly'; }
    if (nodeType === 'TSMappedType') { return readonlyProp === true || readonlyProp === '+'; }

    return false;
  }

  public static collectOffenders(node: unknown, result: Rule.Node[]): void {
    if (node === null || node === undefined || typeof node !== 'object') { return; }

    if (Array.isArray(node)) {
      const len = node.length;
      for (let i = 0; i < len; i++) {
        ReadonlyDetection.collectOffenders(node[i], result);
      }
      return;
    }

    const obj = node as Record<string, unknown>;

    if (ReadonlyDetection.isReadonlyOffender(obj)) {
      result.push(node as unknown as Rule.Node);
    }

    const isTSConditionalType = obj.type === 'TSConditionalType';
    const keys = Object.keys(obj);
    const keysLen = keys.length;

    for (let i = 0; i < keysLen; i++) {
      const key = keys[i];
      if (key === undefined) { continue; }
      if (key === 'parent' || key === 'loc' || key === 'range') { continue; }
      if (isTSConditionalType && (key === 'checkType' || key === 'extendsType')) { continue; }
      ReadonlyDetection.collectOffenders(obj[key], result);
    }
  }
}

class ReadonlyTokenFilter {
  public static matches(t: unknown): boolean {
    if (t === null || typeof t !== 'object') { return false; }
    const tokenValue = (t as Record<string, unknown>).value;
    return tokenValue === 'readonly';
  }
}

class ReadonlyRemoveFix {
  public static make(startPos: number, nextStart: number): (fixer: Rule.RuleFixer) => Rule.Fix | null {
    return (fixer: Rule.RuleFixer) => {
      const start = startPos;
      const end = nextStart;
      const fix = fixer.removeRange([start, end]);
      return fix;
    };
  }
}

class ReadonlyCheck {
  public static checkAlias(context: Rule.RuleContext, services: ParserServicesType, checker: TypeChecker, node: Rule.Node): void {
    const { sourceCode } = context;
    const rawNode = node as unknown as AliasNodeType;

    const symbol = services.getSymbolAtLocation(rawNode.id);
    if (symbol === undefined) { return; }

    const type = checker.getDeclaredTypeOfSymbol(symbol);

    if (!ReadonlyDetection.bakesReadonly(checker, type, new Set())) { return; }

    const offenders: Rule.Node[] = [];
    ReadonlyDetection.collectOffenders(node, offenders);

    const name = rawNode.id.name;

    const reportOffender = (offender: Rule.Node): void => {
      const readonlyToken = sourceCode.getFirstToken(offender, {
        'filter': ReadonlyTokenFilter.matches
      });
      if (readonlyToken === null) { return; }

      const nextToken = sourceCode.getTokenAfter(readonlyToken);
      if (nextToken === null) { return; }

      const prevToken = sourceCode.getTokenBefore(readonlyToken);
      let startPos = 0;
      if (prevToken !== null) {
        const prevObj = prevToken as unknown as Record<string, unknown>;
        const pv = prevObj.value;
        if (pv === '+') {
          const pRange = prevObj.range as [number, number] | undefined;
          const [pStart] = pRange ?? [0];
          if (pStart !== undefined && pStart !== 0) {
            startPos = pStart;
          }
        }
      }
      if (startPos === 0) {
        const rtObj = readonlyToken as unknown as Record<string, unknown>;
        const rtRange = rtObj.range as [number, number] | undefined;
        const [rtStart] = rtRange ?? [0];
        if (rtStart !== undefined) {
          startPos = rtStart;
        }
      }

      const ntObj = nextToken as unknown as Record<string, unknown>;
      const ntRange = ntObj.range as [number, number] | undefined;
      const [ntStart] = ntRange ?? [0];
      const nextStart = ntStart ?? 0;

      context.report({
        'data': { 'name': name },
        'fix': ReadonlyRemoveFix.make(startPos, nextStart),
        'messageId': 'noReadonly',
        'node': offender
      });
    };

    offenders.forEach(reportOffender);
  }
}

// ---------------------------------------------------------------------------
// Check 3: noAliasing — disallow naked type re-aliases and import aliases.
// ---------------------------------------------------------------------------

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

class AliasingAstHelpers {
  public static getTypeArgNames(typeArguments: unknown): readonly string[] | undefined {
    if (!AstHelpers.isJsonObject(typeArguments)) { return undefined; }
    const params = typeArguments.params;

    if (!Array.isArray(params)) { return undefined; }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const arg: unknown = params[i];

      if (!AstHelpers.isJsonObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') {
        return undefined;
      }
      const typeName = arg.typeName;
      const name = AstHelpers.getIdentifierName(typeName);

      if (name === undefined) { return undefined; }
      names.push(name);
    }

    return names;
  }

  public static getTypeParamNames(typeParameters: unknown): readonly string[] {
    if (!AstHelpers.isJsonObject(typeParameters)) { return []; }
    const params = typeParameters.params;

    if (!Array.isArray(params)) { return []; }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const param: unknown = params[i];
      const nameNode = AstHelpers.isJsonObject(param) ? param.name : undefined;
      const name = AstHelpers.getIdentifierName(nameNode);

      if (name === undefined) { return []; }
      names.push(name);
    }

    return names;
  }
}

class GenericAliasAnalysis {
  public static hasTypeParameters(node: unknown): boolean {
    if (!AstHelpers.isJsonObject(node)) { return false; }
    let wrapper: Record<string, unknown> | undefined;
    if (Array.isArray(node.params)) {
      wrapper = node;
    } else if (AstHelpers.isJsonObject(node.typeParameters)) {
      wrapper = node.typeParameters;
    } else if (AstHelpers.isJsonObject(node.typeArguments)) {
      wrapper = node.typeArguments;
    }

    if (!AstHelpers.isJsonObject(wrapper)) { return false; }
    const paramsBody = wrapper.params;

    if (!Array.isArray(paramsBody)) { return false; }

    return paramsBody.length > 0;
  }

  public static isGenericForwardingShim(
    leftNames: readonly string[],
    annotation: unknown
  ): { 'params': string; 'rhsName': string; } | undefined {
    if (!AstHelpers.isJsonObject(annotation) || AstHelpers.getNodeType(annotation) !== 'TSTypeReference') {
      return undefined;
    }
    const rhsTypeArgs = annotation.typeArguments ?? annotation.typeParameters;
    const rightNames = AliasingAstHelpers.getTypeArgNames(rhsTypeArgs);

    if (rightNames?.length !== leftNames.length) { return undefined; }

    const len = leftNames.length;
    for (let i = 0; i < len; i += 1) {
      if (leftNames[i] !== rightNames[i]) { return undefined; }
    }
    const typeName = annotation.typeName;
    const rhsName = AstHelpers.getIdentifierName(typeName);

    if (rhsName === undefined) { return undefined; }

    return { 'params': leftNames.join(', '), 'rhsName': rhsName };
  }
}

class AliasingCheck {
  /**
   * Returns `true` when this check reported (or would report, ignoring severity) a
   * "delete this declaration, use the right-hand side directly" violation. The caller
   * uses this to suppress `mustEndType`'s "rename this declaration" advice on the same
   * node — renaming a declaration that should be deleted entirely is contradictory advice.
   */
  public static checkTypeAlias(context: Rule.RuleContext, node: Rule.Node): boolean {
    const rawNode = node as unknown as {
      'id': { 'name': string };
      'typeAnnotation': unknown;
      'typeParameters': unknown;
    };

    const leftParamNames = AliasingAstHelpers.getTypeParamNames(rawNode.typeParameters);

    if (leftParamNames.length > 0) {
      const forwarding = GenericAliasAnalysis.isGenericForwardingShim(leftParamNames, rawNode.typeAnnotation);

      if (forwarding !== undefined) {
        context.report({
          'data': { 'name': rawNode.id.name, 'params': forwarding.params, 'rhs': forwarding.rhsName },
          'messageId': 'genericForwardingAlias',
          'node': node
        });
        return true;
      }

      return false;
    }

    const annotation = rawNode.typeAnnotation;
    const annotationType = AstHelpers.getNodeType(annotation);

    if (annotationType === undefined) { return false; }

    if (PRIMITIVE_TYPES.has(annotationType)) {
      const display = PrimitiveDisplay.get(annotationType);

      context.report({
        'data': { 'name': rawNode.id.name, 'rhs': display },
        'messageId': 'primitiveTypeAlias',
        'node': node
      });

      return true;
    }

    if (annotationType === 'TSTypeReference') {
      if (GenericAliasAnalysis.hasTypeParameters(annotation)) { return false; }
      const typeName = AstHelpers.isJsonObject(annotation) ? annotation.typeName : undefined;
      const rhsName = AstHelpers.getIdentifierName(typeName);

      if (rhsName === undefined) { return false; }

      context.report({
        'data': { 'name': rawNode.id.name, 'rhs': rhsName },
        'messageId': 'nakedTypeAlias',
        'node': node
      });
      return true;
    }

    return false;
  }

  public static checkImportSpecifier(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode = node as unknown as {
      'imported': { 'name': string };
      'local': { 'name': string };
    };

    const importedName = rawNode.imported.name;
    const localName = rawNode.local.name;

    if (importedName === localName) { return; }

    context.report({
      'data': { 'imported': importedName, 'local': localName },
      'messageId': 'importAlias',
      'node': node
    });
  }
}

// ---------------------------------------------------------------------------
// Check 4: derivedFromSchema — disallow inline object-literal type aliases
// outside entities/.
// ---------------------------------------------------------------------------

const DIRECTIVE_PATTERN = /^\s*json-schema-uninexpressible:\s*\S.{9,}/v;

class FilePathCheck {
  public static isInEntitiesFile(filename: string): boolean {
    const normalized = filename.split(path.sep).join('/');
    return normalized.includes('/entities/');
  }
}

// json-schema-uninexpressible: ad-hoc narrowed view into an ESLint `Comment` AST token's shape — the real
// authority for this shape is ESLint's SourceCode API, not a domain shape this package owns or defines
type CommentToken = { readonly 'type': string; readonly 'value': string };

// json-schema-uninexpressible: 'getCommentsBefore' is function-typed — function types have no JSON Schema
// equivalent
type SourceCodeLike = { 'getCommentsBefore': (node: unknown) => readonly CommentToken[] };

class ExemptionComment {
  public static commentsContainDirective(comments: readonly CommentToken[]): boolean {
    const length = comments.length;
    for (let index = 0; index < length; index++) {
      const comment = comments[index];
      if (comment?.type === 'Line' && DIRECTIVE_PATTERN.test(comment.value)) { return true; }
    }
    return false;
  }

  public static isSourceCodeLike(value: unknown): value is SourceCodeLike {
    return AstHelpers.isJsonObject(value) && typeof value.getCommentsBefore === 'function';
  }

  public static has(rawNode: unknown, rawSourceCode: unknown): boolean {
    if (!ExemptionComment.isSourceCodeLike(rawSourceCode)) { return false; }
    if (ExemptionComment.commentsContainDirective(rawSourceCode.getCommentsBefore(rawNode))) { return true; }
    if (!AstHelpers.isJsonObject(rawNode)) { return false; }
    const parent: unknown = rawNode.parent;
    if (AstHelpers.isJsonObject(parent) && parent.type === 'ExportNamedDeclaration') {
      return ExemptionComment.commentsContainDirective(rawSourceCode.getCommentsBefore(parent));
    }
    return false;
  }
}

class TypeAnnotationAnalysis {
  public static isFromSchemaReference(typeAnnotation: unknown): boolean {
    if (!AstHelpers.isJsonObject(typeAnnotation)) { return false; }
    if (typeAnnotation.type !== 'TSTypeReference') { return false; }
    const typeName: unknown = typeAnnotation.typeName;
    if (!AstHelpers.isJsonObject(typeName)) { return false; }
    return typeName.name === 'FromSchema';
  }

  public static isBrandedIntersection(typeAnnotation: unknown): boolean {
    if (!AstHelpers.isJsonObject(typeAnnotation)) { return false; }
    if (typeAnnotation.type !== 'TSIntersectionType') { return false; }
    const types: unknown = typeAnnotation.types;
    if (!Array.isArray(types)) { return false; }

    return types.some((member: unknown) => {
      if (!AstHelpers.isJsonObject(member)) { return false; }
      if (member.type !== 'TSTypeLiteral') { return false; }
      const members: unknown = member.members;
      if (!Array.isArray(members)) { return false; }

      return members.some((prop: unknown) => {
        if (!AstHelpers.isJsonObject(prop)) { return false; }
        if (prop.type !== 'TSPropertySignature') { return false; }
        const typeAnnotationNode: unknown = prop.typeAnnotation;
        if (!AstHelpers.isJsonObject(typeAnnotationNode)) { return false; }
        const innerType: unknown = typeAnnotationNode.typeAnnotation;
        if (!AstHelpers.isJsonObject(innerType)) { return false; }
        const innerTypeAnnotation: unknown = innerType.typeAnnotation;

        return innerType.type === 'TSTypeOperator'
          && innerType.operator === 'unique'
          && AstHelpers.isJsonObject(innerTypeAnnotation)
          && innerTypeAnnotation.type === 'TSSymbolKeyword';
      });
    });
  }

  public static isExemptAnnotationType(typeAnnotation: unknown): boolean {
    if (!AstHelpers.isJsonObject(typeAnnotation)) { return false; }
    const annotationType: unknown = typeAnnotation.type;

    if (
      annotationType === 'TSFunctionType'
      || annotationType === 'TSConditionalType'
      || annotationType === 'TSMappedType'
    ) {
      return true;
    }

    if (annotationType === 'TSUnionType' || annotationType === 'TSIntersectionType') {
      const types: unknown = typeAnnotation.types;
      if (!Array.isArray(types)) { return false; }

      const allNamed = types.every((member: unknown) => {
        if (!AstHelpers.isJsonObject(member)) { return false; }
        return member.type === 'TSTypeReference';
      });

      if (allNamed) { return true; }
    }

    if (TypeAnnotationAnalysis.isBrandedIntersection(typeAnnotation)) { return true; }
    if (TypeAnnotationAnalysis.isFromSchemaReference(typeAnnotation)) { return true; }

    return false;
  }
}

class DerivedFromSchemaNodeName {
  public static get(rawNode: unknown): string {
    if (!AstHelpers.isJsonObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!AstHelpers.isJsonObject(idNode)) { return ''; }
    const name: unknown = idNode.name;
    return typeof name === 'string' ? name : '';
  }
}

/**
 * Detects a `TSTypeLiteral` member whose type resolves (via the real type
 * checker) to a symbol declared outside this repo's own source tree — i.e.
 * an externally-imported type from a dependency. We don't own/define those
 * shapes, so a local type alias that just wraps/references one isn't a
 * domain data shape we should be redeclaring or schema-validating as our
 * own — the same reasoning `noPreferExisting` already applies to duplicate
 * shapes.
 */
class ExternalTypeReference {
  public static referencesExternalType(
    typeAnnotation: Record<string, unknown>,
    services: ParserServicesType | undefined,
    checker: TypeChecker | undefined
  ): boolean {
    if (services === undefined || checker === undefined) { return false; }

    const members: unknown = typeAnnotation.members;
    if (!Array.isArray(members)) { return false; }

    return members.some((member: unknown) => {
      if (!AstHelpers.isJsonObject(member)) { return false; }
      if (member.type !== 'TSPropertySignature') { return false; }
      const memberTypeAnnotation: unknown = member.typeAnnotation;
      if (!AstHelpers.isJsonObject(memberTypeAnnotation)) { return false; }
      const innerType: unknown = memberTypeAnnotation.typeAnnotation;
      if (!AstHelpers.isJsonObject(innerType)) { return false; }

      return ExternalTypeReference.isDeclaredExternally(innerType, services);
    });
  }

  private static isDeclaredExternally(
    typeNode: unknown,
    services: ParserServicesType
  ): boolean {
    const type = services.getTypeAtLocation(typeNode);
    const symbol = type.aliasSymbol ?? type.getSymbol();
    if (symbol === undefined) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    if (declarations.length === 0) { return false; }

    return declarations.every((declaration) => {
      const fileName = declaration.getSourceFile().fileName;
      return fileName.includes('/node_modules/');
    });
  }
}

class DerivedFromSchemaCheck {
  public static run(
    context: Rule.RuleContext,
    node: Rule.Node,
    services: ParserServicesType | undefined,
    checker: TypeChecker | undefined
  ): void {
    const filename = context.filename;
    const { sourceCode } = context;

    const nodeAsUnknown: unknown = node;
    if (!AstHelpers.isJsonObject(nodeAsUnknown)) { return; }
    const typeAnnotation: unknown = nodeAsUnknown.typeAnnotation;
    if (!AstHelpers.isJsonObject(typeAnnotation) || typeAnnotation.type !== 'TSTypeLiteral') { return; }

    if (filename !== '<input>' && FilePathCheck.isInEntitiesFile(filename)) { return; }
    if (TypeAnnotationAnalysis.isExemptAnnotationType(typeAnnotation)) { return; }
    if (ExternalTypeReference.referencesExternalType(typeAnnotation, services, checker)) { return; }
    if (ExemptionComment.has(node, sourceCode)) { return; }

    context.report({
      'data': { 'name': DerivedFromSchemaNodeName.get(node) },
      'messageId': 'derivedFromSchema',
      'node': node
    });
  }
}

// ---------------------------------------------------------------------------
// Check 5: noPreferExisting — disallow locally-declared object types/interfaces
// whose shape already exists in an imported package.
// ---------------------------------------------------------------------------

type CheckerWithAssignable = TypeChecker & {
  readonly 'isTypeAssignableTo': (a: Type, b: Type) => boolean;
};

type NoPreferExistingMatchResultType = 'exactMatch' | 'nearMatch' | 'off' | 'subsumedMatch';

class TypeMatching {
  public static isTypeAssignable(checker: TypeChecker, a: Type, b: Type): boolean {
    const result = (checker as unknown as CheckerWithAssignable).isTypeAssignableTo(a, b);
    return result;
  }

  public static isOptionalSymbol(symbol: Symbol): boolean {
    return (symbol.flags & SymbolFlags.Optional) !== 0;
  }

  public static classifyMatch(
    localType: Type,
    localProps: readonly Symbol[],
    importedType: Type,
    checker: TypeChecker,
    minFields: number
  ): NoPreferExistingMatchResultType {
    if (localProps.length < minFields) { return 'off'; }

    const importedCoversLocal = TypeMatching.isTypeAssignable(checker, importedType, localType);

    if (!importedCoversLocal) { return 'off'; }

    const localCoversImported = TypeMatching.isTypeAssignable(checker, localType, importedType);

    if (!localCoversImported) { return 'subsumedMatch'; }

    const importedProps = importedType.getProperties();
    const localReqCount = localProps.filter((p) => { return !TypeMatching.isOptionalSymbol(p); }).length;
    const importedReqCount = importedProps.filter((p) => { return !TypeMatching.isOptionalSymbol(p); }).length;
    const localOptCount = localProps.length - localReqCount;
    const importedOptCount = importedProps.length - importedReqCount;

    if (localReqCount === importedReqCount && localOptCount === importedOptCount) { return 'exactMatch'; }

    return 'nearMatch';
  }
}

// json-schema-uninexpressible: ad-hoc narrowed view into an ImportDeclaration source-literal AST node's
// shape — the real authority for this shape is the parser (@typescript-eslint/parser), not a domain shape
// this package owns; used for a single unsafe cast, never serialized
type RawImportSourceType = {
  readonly 'value': string;
};

// json-schema-uninexpressible: 'id' is typed as bare `object & {...}` — TS's structural `object` type has
// no JSON Schema equivalent (it means "any non-primitive," not a defined shape); also an ad-hoc narrowed
// view into a TSTypeAliasDeclaration AST node, not a domain shape this package owns
type RawTSTypeAliasDeclarationType = {
  readonly 'id': object & { readonly 'name': string };
  readonly 'typeAnnotation': { readonly 'type': string };
};

// json-schema-uninexpressible: 'id' is typed as bare `object & {...}` — TS's structural `object` type has
// no JSON Schema equivalent; also an ad-hoc narrowed view into a TSInterfaceDeclaration AST node, not a
// domain shape this package owns
type RawTSInterfaceDeclarationType = {
  readonly 'id': object & { readonly 'name': string };
};

type ImportedCandidateType = {
  readonly 'exportName': string;
  readonly 'packageName': string;
  readonly 'type': Type;
};

class PreferExistingCheck {
  private readonly context: Rule.RuleContext;
  private readonly services: ParserServicesType;
  private readonly checker: TypeChecker;
  private readonly options: ResolvedNoPreferExistingOptionsType;
  private cachedCandidates: ImportedCandidateType[] | undefined = undefined;

  public constructor(
    context: Rule.RuleContext,
    services: ParserServicesType,
    checker: TypeChecker,
    options: ResolvedNoPreferExistingOptionsType
  ) {
    this.context = context;
    this.services = services;
    this.checker = checker;
    this.options = options;
  }

  private getCandidates(): ImportedCandidateType[] {
    if (this.cachedCandidates !== undefined) { return this.cachedCandidates; }

    const candidates: ImportedCandidateType[] = [];
    const { body } = this.context.sourceCode.ast;

    body.forEach((statement) => {
      if (statement.type !== 'ImportDeclaration') { return; }
      const source = (statement as unknown as { readonly 'source': RawImportSourceType }).source.value;

      const isExcluded = this.options.excludePrefixes.some((prefix) => { const matches = source.startsWith(prefix); return matches; });
      if (isExcluded) { return; }

      const moduleSymbol = this.services.getSymbolAtLocation(
        (statement as unknown as { readonly 'source': object }).source
      );

      if (moduleSymbol === undefined) { return; }

      const exports = this.checker.getExportsOfModule(moduleSymbol);

      exports.forEach((exportSymbol) => {
        const isTypeAliasExport = (exportSymbol.flags & SymbolFlags.TypeAlias) !== 0;
        const exportType = isTypeAliasExport
          ? this.checker.getDeclaredTypeOfSymbol(exportSymbol)
          : this.checker.getTypeOfSymbol(exportSymbol);

        const isObjectType = (exportType.flags & TypeFlags.Object) !== 0;

        if (!isObjectType) { return; }

        const props = exportType.getProperties();

        if (props.length > 0) {
          candidates.push({
            'exportName': exportSymbol.getName(),
            'packageName': source,
            'type': exportType
          });
        }
      });
    });

    this.cachedCandidates = candidates;
    return this.cachedCandidates;
  }

  /**
   * Returns `true` when this check reported a "delete this declaration, use the imported
   * type directly (or compose with it)" violation — used by the caller to suppress
   * `mustEndType`'s "rename this declaration" advice on the same node.
   */
  private checkLocalTypeAgainstCandidates(node: Rule.Node, localName: string, localType: Type): boolean {
    const candidates = this.getCandidates();

    if (candidates.length === 0) { return false; }

    const localProps = localType.getProperties();
    const fields = localProps
      .map((p) => { const name = p.getName(); return `'${name}'`; })
      .join(' | ');

    for (const candidate of candidates) {
      const matchResult = TypeMatching.classifyMatch(localType, localProps, candidate.type, this.checker, this.options.minFields);

      if (matchResult === 'off') { continue; }

      let severity: SeverityType;
      if (matchResult === 'exactMatch') {
        severity = this.options.exactMatch;
      } else if (matchResult === 'nearMatch') {
        severity = this.options.nearMatch;
      } else if (matchResult === 'subsumedMatch') {
        severity = this.options.subsumedMatch;
      } else {
        continue;
      }

      if (severity === 'off') { continue; }

      const reportData = {
        'fields': fields,
        'imported': candidate.exportName,
        'local': localName,
        'package': candidate.packageName
      };
      this.context.report({
        'data': reportData,
        'messageId': matchResult,
        'node': node
      });

      return true;
    }

    return false;
  }

  public checkTypeAlias(node: Rule.Node): boolean {
    const rawNode = node as unknown as RawTSTypeAliasDeclarationType;

    if (rawNode.typeAnnotation.type !== 'TSTypeLiteral') { return false; }

    const aliasSymbol = this.services.getSymbolAtLocation(rawNode.id);
    const localType = aliasSymbol !== undefined
      ? this.checker.getDeclaredTypeOfSymbol(aliasSymbol)
      : this.services.getTypeAtLocation(rawNode.typeAnnotation);

    return this.checkLocalTypeAgainstCandidates(node, rawNode.id.name, localType);
  }

  public checkInterface(node: Rule.Node): void {
    const rawNode = node as unknown as RawTSInterfaceDeclarationType;

    const interfaceSymbol = this.services.getSymbolAtLocation(rawNode.id);
    const localType = interfaceSymbol !== undefined
      ? this.checker.getDeclaredTypeOfSymbol(interfaceSymbol)
      : this.services.getTypeAtLocation(node);

    this.checkLocalTypeAgainstCandidates(node, rawNode.id.name, localType);
  }
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export const typeAliasInvariants: Rule.RuleModule = {
  'create': (context) => {
    const options = OptionsResolution.resolve(context);
    const services = ContextHelpers.getServices(context);
    const checker = services?.program === undefined ? undefined : services.program.getTypeChecker();

    const noPreferExistingCheck =
      options.noPreferExisting.enabled && services !== undefined && checker !== undefined
        ? new PreferExistingCheck(context, services, checker, options.noPreferExisting)
        : undefined;

    /** Local names re-exported by a same-file, non-re-exporting `export { ... }` specifier list (check 2). */
    const locallyExportedNames = new Set<string>();
    /** Type aliases declared at `Program` scope, deferred until every export specifier is seen (check 2). */
    const pendingReadonlyAliasNodes: Rule.Node[] = [];

    const onExportNamedDeclaration = (node: Rule.Node): void => {
      if (!options.noReadonly) { return; }

      const rawNode = node as unknown as ExportNamedDeclarationNodeType;

      if (rawNode.source !== null && rawNode.source !== undefined) { return; }

      const specifiers = rawNode.specifiers ?? [];
      specifiers.forEach((specifier) => {
        locallyExportedNames.add(specifier.local.name);
      });
    };

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      // noAliasing/noPreferExisting's exactMatch|nearMatch|subsumedMatch all recommend deleting
      // this declaration and using the right-hand-side type directly — run them first so a
      // "delete it" verdict suppresses mustEndType's "rename it" advice on the same node below.
      const recommendsDeletion =
        (options.noAliasing && AliasingCheck.checkTypeAlias(context, node))
        || noPreferExistingCheck?.checkTypeAlias(node) === true;

      if (options.mustEndType && !recommendsDeletion) {
        MustEndTypeCheck.run(context, node);
      }

      // noPreferExisting's exactMatch/nearMatch/subsumedMatch (part of recommendsDeletion above)
      // also only target inline-object-literal aliases — the same RHS shape derivedFromSchema
      // targets. If the local shape already duplicates/near-duplicates an imported type,
      // entity-ifying it would just re-declare the same redundant shape in a new location, so
      // that verdict takes precedence over derivedFromSchema's "move this into an entity" advice.
      if (options.derivedFromSchema && !recommendsDeletion) {
        DerivedFromSchemaCheck.run(context, node, services, checker);
      }

      if (options.noReadonly && services !== undefined && checker !== undefined) {
        const rawNode = node as unknown as AliasNodeType;

        if (rawNode.parent.type === 'ExportNamedDeclaration') {
          ReadonlyCheck.checkAlias(context, services, checker, node);
          return;
        }

        if (rawNode.parent.type === 'Program') {
          pendingReadonlyAliasNodes.push(node);
        }
      }
    };

    const onTSInterfaceDeclaration = (node: Rule.Node): void => {
      if (noPreferExistingCheck !== undefined) {
        noPreferExistingCheck.checkInterface(node);
      }
    };

    const onImportSpecifier = (node: Rule.Node): void => {
      if (!options.noAliasing) { return; }
      AliasingCheck.checkImportSpecifier(context, node);
    };

    const onProgramExit = (): void => {
      if (!options.noReadonly || services === undefined || checker === undefined) { return; }

      pendingReadonlyAliasNodes.forEach((node) => {
        const rawNode = node as unknown as AliasNodeType;
        if (locallyExportedNames.has(rawNode.id.name)) {
          ReadonlyCheck.checkAlias(context, services, checker, node);
        }
      });
    };

    return {
      'ExportNamedDeclaration': onExportNamedDeclaration,
      'ImportSpecifier': onImportSpecifier,
      'Program:exit': onProgramExit,
      'TSInterfaceDeclaration': onTSInterfaceDeclaration,
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description':
        'Merged type-alias invariants: exported aliases must end in `Type`, must not bake in `readonly`, must not be naked re-aliases, must derive data shapes from JSON Schema, and must not duplicate an imported package shape.'
    },
    'fixable': 'code',
    'messages': {
      'derivedFromSchema': "Type alias '{{name}}' declares an inline object shape '{ ... }'. Data types must be derived from JSON Schema via 'FromSchema<typeof {{name}}Schema>'. Move this shape into an entity namespace at 'entities/{{name}}Entity.ts' (export namespace {{name}}Entity { export const Schema = ...; export type Type = FromSchema<typeof Schema>; export const validate = ...; }), or — if JSON Schema cannot express this shape (function type, branded primitive, mapped type, conditional type) — add '// json-schema-uninexpressible: <reason>' immediately before the declaration with a clear justification (at least 10 characters).",
      'exactMatch': "Type '{{local}}' duplicates '{{imported}}' from '{{package}}'. Delete the local declaration and import '{{imported}}' directly.",
      'genericForwardingAlias': "Type alias '{{name}}' is a generic forwarding shim — '{{rhs}}<{{params}}>' renames '{{rhs}}' without transformation. Use '{{rhs}}' directly with the type arguments at each call site.",
      'importAlias': "Import alias '{{local}}' hides the canonical name '{{imported}}'. Use '{{imported}}' directly.",
      'mustEndType': "Exported type alias '{{name}}' must end in 'Type'. Rename to '{{name}}Type'.",
      'nakedTypeAlias': "Type alias '{{name}}' is a naked rename of '{{rhs}}'. Use '{{rhs}}' directly — do not create local synonyms for canonical types.",
      'nearMatch': "Type '{{local}}' matches all required fields of '{{imported}}' from '{{package}}' but differs in optional fields. Use '{{imported}}' or compose with it.",
      'noReadonly': "Exported data type '{{name}}' bakes in `readonly`. A `type` describes shape, not access policy — consumers declare immutability at the use site (`readonly`, `Readonly<T>`, `DeepReadonlyType<T>`).",
      'primitiveTypeAlias': "Type alias '{{name}}' wraps primitive type '{{rhs}}'. Use '{{rhs}}' directly.",
      'subsumedMatch': "Type '{{local}}' is fully subsumed by '{{imported}}' from '{{package}}' (fields: {{fields}}). Import '{{imported}}' directly and use it whole — do not derive a subset via Pick/Omit/Partial (see whole-canonical-types)."
    },
    'schema': [OPTIONS_SCHEMA],
    'type': 'problem'
  }
};
