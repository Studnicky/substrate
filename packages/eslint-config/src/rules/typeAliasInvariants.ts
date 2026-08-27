import type { Rule } from 'eslint';

import {
  isTypeAliasDeclaration,
  type Node,
  type Program,
  type TypeAliasDeclaration
} from 'typescript';

import {
  PRIMITIVE_DISPLAY_NAMES, PRIMITIVE_TYPES
} from './constants/TypeAliasInvariantsConstants.js';
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
 * Declaration-shape and canonical-purity verdicts precede naming and readonly checks.
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
  private static readonly cache = new WeakMap<object, ReadonlyMap<string, string>>();

  /**
   * Maps each locally-declared name to the name a separate, non-declaring `export { ... }`
   * specifier list actually re-exports it as. Consumers only ever see the `exported` name — a
   * declaration named `LocalNameType` re-exported as `ExportedNonTypeName` is imported by every
   * consumer as `ExportedNonTypeName`, so that is the name the `Type`-suffix requirement must be
   * checked against, not the declaration's own local name.
   */
  public static collect(context: Rule.RuleContext): ReadonlyMap<string, string> {
    const program = context.sourceCode.ast;
    const cached = ReexportedTypeNames.cache.get(program);

    if (cached !== undefined) {
      return cached;
    }

    const names = new Map<string, string>();
    const body: readonly unknown[] = Array.isArray(program.body) ? program.body : [];

    body.forEach((statement) => {
      if (!ObjectGuard.isObject(statement)) {
        return;
      }
      if (statement.type !== 'ExportNamedDeclaration') {
        return;
      }
      if (statement.declaration !== null && statement.declaration !== undefined) {
        return;
      }
      if (statement.source !== null && statement.source !== undefined) {
        return;
      }

      const specifiers: readonly unknown[] = Array.isArray(statement.specifiers) ? statement.specifiers : [];
      const specifiersLength = specifiers.length;

      for (let specifierIndex = 0; specifierIndex < specifiersLength; specifierIndex += 1) {
        const specifier = specifiers.at(specifierIndex);

        if (!ObjectGuard.isObject(specifier)) {
          continue;
        }
        if (statement.exportKind === 'type' || specifier.exportKind === 'type') {
          const localName = ObjectGuard.isObject(specifier.local)
            ? AstHelpers.getIdentifierName(specifier.local)
            : undefined;
          const exportedName = ObjectGuard.isObject(specifier.exported)
            ? AstHelpers.getIdentifierName(specifier.exported)
            : undefined;

          if (localName !== undefined && exportedName !== undefined) {
            names.set(localName, exportedName);
          }
        }
      }
    });

    ReexportedTypeNames.cache.set(program, names);

    return names;
  }
}

class MustEndTypeCheck {
  public static run(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;

    if (!ObjectGuard.isObject(rawNode) || !ObjectGuard.isObject(rawNode.parent)) {
      return;
    }
    const name = AstHelpers.getIdentifierName(rawNode.id);

    if (name === undefined) {
      return;
    }

    const isInlineExport = rawNode.parent.type === 'ExportNamedDeclaration';
    const reexportedAs = rawNode.parent.type === 'Program' ? ReexportedTypeNames.collect(context).get(name) : undefined;
    const isSeparateReexport = reexportedAs !== undefined;

    if (!isInlineExport && !isSeparateReexport) {
      return;
    }

    // The exported name is the name surface consumers actually see — check that, falling back to
    // the declared name only when there is no separate re-export renaming it.
    const nameToCheck = reexportedAs ?? name;

    if (nameToCheck.endsWith('Type')) {
      return;
    }

    context.report({
      'data': { 'name': nameToCheck },
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
    if (!ObjectGuard.isObject(value)) {
      return false;
    }
    if (!ObjectGuard.isObject(value.esTreeNodeToTSNodeMap) || typeof value.esTreeNodeToTSNodeMap.get !== 'function') {
      return false;
    }

    const result = ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';

    return result;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;

    const result = ParserServicesGuard.hasTypeInformation(services) ? services : undefined;

    return result;
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
      const evidence = evidenceList.at(index);

      if (evidence === undefined) {
        continue;
      }
      const evidenceStart = evidence.node.getStart(sourceFile);
      const evidenceEnd = evidence.node.getEnd();
      const location = {
        'end': sourceCode.getLocFromIndex(evidenceEnd),
        'start': sourceCode.getLocFromIndex(evidenceStart)
      };

      // NO AUTOFIX HERE, DELIBERATELY. DO NOT REINSTATE ONE.
      //
      // A previous revision stripped the `readonly` modifier's text range. That is a
      // SEMANTIC TYPE CHANGE, and it is the dangerous kind: it typechecks. Removing
      // `readonly` does not break the build — it makes previously-rejected mutation
      // compile, silently discarding an immutability guarantee someone chose on
      // purpose. A fixer whose failure mode is "the code still builds but is now
      // mutable" is worse than one that breaks loudly, because nothing surfaces it.
      //
      // Standing policy: an autofixer may exist ONLY for a transformation that
      // cannot break the build or change program meaning. Deciding whether a
      // readonly output type should be relaxed, or the surrounding design changed
      // instead, is a judgement about intent. This rule reports; a person fixes.
      context.report({
        'data': { 'name': declaration.name.text },
        'loc': location,
        'messageId': 'noReadonly'
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check 3: noAliasing — disallow naked type re-aliases and import aliases.
// ---------------------------------------------------------------------------

class PrimitiveDisplay {
  public static get(type: string): string {
    const result = PRIMITIVE_DISPLAY_NAMES.get(type) ?? type;

    return result;
  }
}

class AliasingAstHelpers {
  public static getTypeArgNames(typeArguments: unknown): readonly string[] | undefined {
    if (!ObjectGuard.isObject(typeArguments)) {
      return undefined;
    }
    const parameters = typeArguments.params;

    if (!Array.isArray(parameters)) {
      return undefined;
    }

    const names: string[] = [];
    const parameterCount = parameters.length;

    for (let i = 0; i < parameterCount; i += 1) {
      const arg: unknown = parameters.at(i);

      if (!ObjectGuard.isObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') {
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
    if (!ObjectGuard.isObject(typeParameters)) {
      return [];
    }
    const parameters = typeParameters.params;

    if (!Array.isArray(parameters)) {
      return [];
    }

    const names: string[] = [];
    const parameterCount = parameters.length;

    for (let i = 0; i < parameterCount; i += 1) {
      const param: unknown = parameters.at(i);
      const nameNode = ObjectGuard.isObject(param) ? param.name : undefined;
      const name = AstHelpers.getIdentifierName(nameNode);

      if (name === undefined) {
        return [];
      }
      names.push(name);
    }

    return names;
  }
}

class GenericAliasAnalysis {
  public static hasTypeParameters(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) {
      return false;
    }
    let wrapper: Record<string, unknown> | undefined;

    if (Array.isArray(node.params)) {
      wrapper = node;
    } else if (ObjectGuard.isObject(node.typeParameters)) {
      wrapper = node.typeParameters;
    } else if (ObjectGuard.isObject(node.typeArguments)) {
      wrapper = node.typeArguments;
    }

    if (!ObjectGuard.isObject(wrapper)) {
      return false;
    }
    const parameterList = wrapper.params;

    if (!Array.isArray(parameterList)) {
      return false;
    }

    const result = parameterList.length > 0;

    return result;
  }

  public static isGenericForwardingShim(
    leftNames: readonly string[],
    annotation: unknown
  ): { 'parameters': string; 'rhsName': string; } | undefined {
    if (!ObjectGuard.isObject(annotation) || AstHelpers.getNodeType(annotation) !== 'TSTypeReference') {
      return undefined;
    }
    const rightHandTypeArguments = annotation.typeArguments ?? annotation.typeParameters;
    const rightNames = AliasingAstHelpers.getTypeArgNames(rightHandTypeArguments);

    if (rightNames?.length !== leftNames.length) {
      return undefined;
    }

    const length = leftNames.length;

    for (let i = 0; i < length; i += 1) {
      if (leftNames.at(i) !== rightNames.at(i)) {
        return undefined;
      }
    }
    const typeName = annotation.typeName;
    const rhsName = AstHelpers.getIdentifierName(typeName);

    if (rhsName === undefined) {
      return undefined;
    }

    return {
      'parameters': leftNames.join(', '), 'rhsName': rhsName
    };
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

    if (!ObjectGuard.isObject(rawNode)) {
      return false;
    }
    const name = AstHelpers.getIdentifierName(rawNode.id);

    if (name === undefined) {
      return false;
    }

    const leftParamNames = AliasingAstHelpers.getTypeParamNames(rawNode.typeParameters);

    if (leftParamNames.length > 0) {
      const forwarding = GenericAliasAnalysis.isGenericForwardingShim(leftParamNames, rawNode.typeAnnotation);

      if (forwarding !== undefined) {
        context.report({
          'data': {
            'name': name, 'parameters': forwarding.parameters, 'rhs': forwarding.rhsName
          },
          'messageId': 'genericForwardingAlias',
          'node': node
        });

        return true;
      }

      return false;
    }

    const annotation = rawNode.typeAnnotation;
    const annotationType = AstHelpers.getNodeType(annotation);

    if (annotationType === undefined) {
      return false;
    }

    if (PRIMITIVE_TYPES.has(annotationType)) {
      const display = PrimitiveDisplay.get(annotationType);

      context.report({
        'data': {
          'name': name, 'rhs': display
        },
        'messageId': 'primitiveTypeAlias',
        'node': node
      });

      return true;
    }

    if (annotationType === 'TSTypeReference') {
      if (GenericAliasAnalysis.hasTypeParameters(annotation)) {
        return false;
      }
      const typeName = ObjectGuard.isObject(annotation) ? annotation.typeName : undefined;
      const rhsName = AstHelpers.getIdentifierName(typeName);

      if (rhsName === undefined) {
        return false;
      }

      context.report({
        'data': {
          'name': name, 'rhs': rhsName
        },
        'messageId': 'nakedTypeAlias',
        'node': node
      });

      return true;
    }

    return false;
  }

  public static checkImportSpecifier(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;

    if (!ObjectGuard.isObject(rawNode)) {
      return;
    }
    const importedName = AstHelpers.getIdentifierName(rawNode.imported);
    const localName = AstHelpers.getIdentifierName(rawNode.local);

    if (importedName === undefined || localName === undefined) {
      return;
    }

    if (importedName === localName) {
      return;
    }

    context.report({
      'data': {
        'imported': importedName, 'local': localName
      },
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

      if (analysis === undefined || declaration === undefined) {
        return;
      }

      if (analysis.classification === 'interfaceContract') {
        // A top-level mixed union/intersection has no interface remedy at all — `interface X`
        // cannot itself be a union — so `no-mixed-callable-shapes` owns this declaration's only
        // diagnostic instead of the unfollowable "declare as an interface" advice.
        //
        // D6 (see the eslint-config objectives): EXCEPT when the mix includes `any` as a direct
        // constituent — `any`'s "callable" classification is `classifyCallability`'s own
        // escape-hatch heuristic (see `topLevelMixIncludesAny`'s doc comment), not a genuine
        // callable shape needing a split into an interface, and `no-mixed-callable-shapes` is not
        // enabled in `eslint.config.mjs` (see C1). Deferring THIS declaration's only diagnostic to
        // a rule that may never run means `type X = any | Data;` escapes every custom type rule
        // silently — VERIFIED via `npx eslint` probe (ZzP4 prefix). Report it here instead,
        // unconditionally, regardless of whether `no-mixed-callable-shapes` ever gets enabled.
        if (
          classification?.isTopLevelMixedCallableData(declaration.type) === true
          && !classification.topLevelMixIncludesAny(declaration.type)
        ) {
          return;
        }

        // A top-level union of independently-declared, pure-data contract interfaces (every
        // constituent readonly-evidenced, none callable) has no interface remedy either — the
        // same "TypeScript cannot express a union as one interface" limitation above, just
        // without a callable constituent to name it after. See
        // `isTopLevelUnionOfDataContractInterfaces`'s doc comment.
        if (classification?.isTopLevelUnionOfDataContractInterfaces(declaration.type) === true) {
          return;
        }

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
        if (AliasingCheck.checkTypeAlias(context, node)) {
          return;
        }

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

      if (AliasingCheck.checkTypeAlias(context, node)) {
        return;
      }
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
    'messages': {
      'aliasMustBeInterface': "Type alias '{{name}}' represents a contract or non-schema type computation. Declare the contract as an interface or redesign the type as schema-derived canonical data.",
      'derivedFromSchema': "Type alias '{{name}}' is not verified schema-derived pure data. Define canonical data with 'FromSchema<typeof Schema>' and compose only verified canonical data types.",
      'genericForwardingAlias': "Type alias '{{name}}' is a generic forwarding shim — '{{rhs}}<{{parameters}}>' renames '{{rhs}}' without transformation. Use '{{rhs}}' directly with the type arguments at each call site.",
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
