import type { Rule } from 'eslint';

import {
  isTypeAliasDeclaration,
  type Node,
  type Program,
  type TypeAliasDeclaration
} from 'typescript';

import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';
import { TypeContractClassification } from './shared/TypeContractClassification.js';

/**
 * Enforces one ordered alias-declaration contract:
 *
 * 1. mustEndType — exported type aliases must end in `Type`.
 * 2. noReadonly — type aliases must not author readonly output policy.
 * 3. noAliasing — disallow naked type re-aliases and import aliases.
 * 4. derivedFromSchema — retain only verified schema-derived pure-data aliases.
 *
 * Declaration-kind and canonical-purity verdicts precede naming and readonly checks.
 * Precise alias-identity diagnostics refine invalid pure-data provenance without
 * relying on structural-similarity heuristics.
 */

// ---------------------------------------------------------------------------
// Check 1: mustEndType — exported type aliases must end in `Type`.
// ---------------------------------------------------------------------------

/**
 * Names re-exported as a type via a separate, non-declaring `export { ... }` specifier list,
 * scanned once per file and cached — `MustEndTypeCheck.run` is called once per top-level type
 * alias, and re-scanning the whole `Program` body per alias would make this O(aliases × body
 * length) instead of O(body length).
 */
class ReexportedTypeNames {
  private static readonly cache = new WeakMap<object, ReadonlySet<string>>();

  public static collect(context: Rule.RuleContext): ReadonlySet<string> {
    const program = context.sourceCode.ast;
    const cached = ReexportedTypeNames.cache.get(program);
    if (cached !== undefined) { return cached; }

    const names = new Set<string>();
    const body: readonly unknown[] = Array.isArray(program.body) ? program.body : [];
    body.forEach((statement) => {
      if (!ObjectGuard.isObject(statement)) { return; }
      if (statement.type !== 'ExportNamedDeclaration') { return; }
      if (statement.declaration !== null && statement.declaration !== undefined) { return; }
      if (statement.source !== null && statement.source !== undefined) { return; }

      const specifiers: readonly unknown[] = Array.isArray(statement.specifiers) ? statement.specifiers : [];
      specifiers.forEach((specifier) => {
        if (!ObjectGuard.isObject(specifier)) { return; }
        if (statement.exportKind === 'type' || specifier.exportKind === 'type') {
          const localName = ObjectGuard.isObject(specifier.local)
            ? AstHelpers.getIdentifierName(specifier.local)
            : undefined;
          if (localName !== undefined) { names.add(localName); }
        }
      });
    });

    ReexportedTypeNames.cache.set(program, names);
    return names;
  }
}

class MustEndTypeCheck {
  public static run(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;
    if (!ObjectGuard.isObject(rawNode) || !ObjectGuard.isObject(rawNode.parent)) { return; }
    const name = AstHelpers.getIdentifierName(rawNode.id);
    if (name === undefined) { return; }

    const isInlineExport = rawNode.parent.type === 'ExportNamedDeclaration';
    const isSeparateReexport =
      rawNode.parent.type === 'Program' && ReexportedTypeNames.collect(context).has(name);

    if (!isInlineExport && !isSeparateReexport) { return; }
    if (name.endsWith('Type')) { return; }

    context.report({
      'data': { 'name': name },
      'messageId': 'mustEndType',
      'node': node
    });
  }
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': ReadonlyMap<object, Node>;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!ObjectGuard.isObject(value.esTreeNodeToTSNodeMap) || typeof value.esTreeNodeToTSNodeMap.get !== 'function') {
      return false;
    }
    return ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    return ParserServicesGuard.hasTypeInformation(services) ? services : undefined;
  }
}

class ReadonlyCheck {
  public static checkAlias(
    context: Rule.RuleContext,
    declaration: TypeAliasDeclaration,
    analysis: ReturnType<TypeContractClassification['analyzeAlias']>
  ): void {
    const { sourceCode } = context;
    const sourceFile = declaration.getSourceFile();

    const evidenceList = analysis.readonlyOutput;
    const evidenceCount = evidenceList.length;
    for (let index = 0; index < evidenceCount; index++) {
      const evidence = evidenceList[index];
      if (evidence === undefined) { continue; }
      const evidenceStart = evidence.node.getStart(sourceFile);
      const evidenceEnd = evidence.node.getEnd();
      const location = {
        'end': sourceCode.getLocFromIndex(evidenceEnd),
        'start': sourceCode.getLocFromIndex(evidenceStart)
      };
      const evidenceText = sourceCode.text.slice(evidenceStart, evidenceEnd);
      const readonlyMatch = /\breadonly\b/u.exec(evidenceText);
      const canFix = evidence.fixable
        && analysis.classification !== 'interfaceContract'
        && analysis.reason !== 'brand'
        && readonlyMatch !== null;

      if (!canFix) {
        context.report({
          'data': { 'name': declaration.name.text },
          'loc': location,
          'messageId': 'noReadonly'
        });
        continue;
      }

      const prefix = evidenceText.slice(0, readonlyMatch.index);
      const plusPrefix = /\+\s*$/u.exec(prefix);
      const relativeStart = plusPrefix?.index ?? readonlyMatch.index;
      let relativeEnd = readonlyMatch.index + readonlyMatch[0].length;
      const followingCharacter = evidenceText[relativeEnd];
      if (followingCharacter === ' ' || followingCharacter === '\t') { relativeEnd += 1; }
      const removalRange: readonly [number, number] = [
        evidenceStart + relativeStart,
        evidenceStart + relativeEnd
      ];
      const fixReadonlyEvidence = (fixer: Rule.RuleFixer): Rule.Fix => {
        const [removalStart, removalEnd] = removalRange;

        return fixer.removeRange([removalStart, removalEnd]);
      };

      context.report({
        'data': { 'name': declaration.name.text },
        'fix': fixReadonlyEvidence,
        'loc': location,
        'messageId': 'noReadonly'
      });
    }
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
    if (!ObjectGuard.isObject(typeArguments)) { return undefined; }
    const params = typeArguments.params;

    if (!Array.isArray(params)) { return undefined; }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const arg: unknown = params[i];

      if (!ObjectGuard.isObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') {
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
    if (!ObjectGuard.isObject(typeParameters)) { return []; }
    const params = typeParameters.params;

    if (!Array.isArray(params)) { return []; }

    const names: string[] = [];
    const paramsLen = params.length;

    for (let i = 0; i < paramsLen; i += 1) {
      const param: unknown = params[i];
      const nameNode = ObjectGuard.isObject(param) ? param.name : undefined;
      const name = AstHelpers.getIdentifierName(nameNode);

      if (name === undefined) { return []; }
      names.push(name);
    }

    return names;
  }
}

class GenericAliasAnalysis {
  public static hasTypeParameters(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    let wrapper: Record<string, unknown> | undefined;
    if (Array.isArray(node.params)) {
      wrapper = node;
    } else if (ObjectGuard.isObject(node.typeParameters)) {
      wrapper = node.typeParameters;
    } else if (ObjectGuard.isObject(node.typeArguments)) {
      wrapper = node.typeArguments;
    }

    if (!ObjectGuard.isObject(wrapper)) { return false; }
    const paramsBody = wrapper.params;

    if (!Array.isArray(paramsBody)) { return false; }

    return paramsBody.length > 0;
  }

  public static isGenericForwardingShim(
    leftNames: readonly string[],
    annotation: unknown
  ): { 'params': string; 'rhsName': string; } | undefined {
    if (!ObjectGuard.isObject(annotation) || AstHelpers.getNodeType(annotation) !== 'TSTypeReference') {
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
    const rawNode: unknown = node;
    if (!ObjectGuard.isObject(rawNode)) { return false; }
    const name = AstHelpers.getIdentifierName(rawNode.id);
    if (name === undefined) { return false; }

    const leftParamNames = AliasingAstHelpers.getTypeParamNames(rawNode.typeParameters);

    if (leftParamNames.length > 0) {
      const forwarding = GenericAliasAnalysis.isGenericForwardingShim(leftParamNames, rawNode.typeAnnotation);

      if (forwarding !== undefined) {
        context.report({
          'data': { 'name': name, 'params': forwarding.params, 'rhs': forwarding.rhsName },
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
        'data': { 'name': name, 'rhs': display },
        'messageId': 'primitiveTypeAlias',
        'node': node
      });

      return true;
    }

    if (annotationType === 'TSTypeReference') {
      if (GenericAliasAnalysis.hasTypeParameters(annotation)) { return false; }
      const typeName = ObjectGuard.isObject(annotation) ? annotation.typeName : undefined;
      const rhsName = AstHelpers.getIdentifierName(typeName);

      if (rhsName === undefined) { return false; }

      context.report({
        'data': { 'name': name, 'rhs': rhsName },
        'messageId': 'nakedTypeAlias',
        'node': node
      });
      return true;
    }

    return false;
  }

  public static checkImportSpecifier(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;
    if (!ObjectGuard.isObject(rawNode)) { return; }
    const importedName = AstHelpers.getIdentifierName(rawNode.imported);
    const localName = AstHelpers.getIdentifierName(rawNode.local);
    if (importedName === undefined || localName === undefined) { return; }

    if (importedName === localName) { return; }

    context.report({
      'data': { 'imported': importedName, 'local': localName },
      'messageId': 'importAlias',
      'node': node
    });
  }
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export const typeAliasInvariants: Rule.RuleModule = {
  'create': (context) => {
    const services = ContextHelpers.getServices(context);
    const classification = services === undefined
      ? undefined
      : TypeContractClassification.forProgram(services.program);

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const typeScriptNode = services?.esTreeNodeToTSNodeMap.get(node);
      const declaration = typeScriptNode !== undefined && isTypeAliasDeclaration(typeScriptNode)
        ? typeScriptNode
        : undefined;
      const analysis = declaration === undefined || classification === undefined
        ? undefined
        : classification.analyzeAlias(declaration);
      if (analysis === undefined || declaration === undefined) { return; }

      if (analysis.classification === 'interfaceContract') {
        const sourceFile = declaration.getSourceFile();
        const evidenceStart = analysis.evidence.getStart(sourceFile);
        const evidenceEnd = analysis.evidence.getEnd();
        context.report({
          'data': { 'name': declaration.name.text },
          'loc': {
            'end': context.sourceCode.getLocFromIndex(evidenceEnd),
            'start': context.sourceCode.getLocFromIndex(evidenceStart)
          },
          'messageId': 'aliasMustBeInterface'
        });
        return;
      }

      if (analysis.classification === 'pureDataInvalid') {
        if (AliasingCheck.checkTypeAlias(context, node)) { return; }

        const sourceFile = declaration.getSourceFile();
        const evidenceStart = analysis.evidence.getStart(sourceFile);
        const evidenceEnd = analysis.evidence.getEnd();
        context.report({
          'data': { 'name': declaration.name.text },
          'loc': {
            'end': context.sourceCode.getLocFromIndex(evidenceEnd),
            'start': context.sourceCode.getLocFromIndex(evidenceStart)
          },
          'messageId': 'derivedFromSchema'
        });
        return;
      }

      if (AliasingCheck.checkTypeAlias(context, node)) { return; }
      MustEndTypeCheck.run(context, node);
      ReadonlyCheck.checkAlias(context, declaration, analysis);
    };

    const onImportSpecifier = (node: Rule.Node): void => {
      AliasingCheck.checkImportSpecifier(context, node);
    };

    return {
      'ImportSpecifier': onImportSpecifier,
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description':
        'Type aliases preserve canonical schema-derived data identity, use interfaces for contracts, and avoid readonly output policy.'
    },
    'fixable': 'code',
    'messages': {
      'aliasMustBeInterface': "Type alias '{{name}}' represents a contract or non-schema type computation. Declare the contract as an interface or redesign the type as schema-derived canonical data.",
      'derivedFromSchema': "Type alias '{{name}}' is not verified schema-derived pure data. Define canonical data with 'FromSchema<typeof Schema>' and compose only verified canonical data types.",
      'genericForwardingAlias': "Type alias '{{name}}' is a generic forwarding shim — '{{rhs}}<{{params}}>' renames '{{rhs}}' without transformation. Use '{{rhs}}' directly with the type arguments at each call site.",
      'importAlias': "Import alias '{{local}}' hides the canonical name '{{imported}}'. Use '{{imported}}' directly.",
      'mustEndType': "Exported type alias '{{name}}' must end in 'Type'. Rename to '{{name}}Type'.",
      'nakedTypeAlias': "Type alias '{{name}}' is a naked rename of '{{rhs}}'. Use '{{rhs}}' directly — do not create local synonyms for canonical types.",
      'noReadonly': "Data type '{{name}}' bakes in `readonly` output policy. Consumers declare immutability at the use site.",
      'primitiveTypeAlias': "Type alias '{{name}}' wraps primitive type '{{rhs}}'. Use '{{rhs}}' directly."
    },
    'schema': [],
    'type': 'problem'
  }
};
