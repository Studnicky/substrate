import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';
import { isObjectLiteralExpression, type Program, type SourceFile, type Symbol, type Type, type TypeChecker } from 'typescript';

import {
  BANNED_SHORTENINGS, EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES, IDENTIFIER_NAME_PATTERN
} from './constants/DescriptiveIdentifiersConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { PackageBoundary } from './shared/PackageBoundary.js';

// Manual scan instead of a single backtracking regex: the equivalent
// `/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g` is polynomial-time on an
// uppercase run followed by a non-letter, non-end character (e.g. a long
// run of capitals immediately before a digit) — the greedy `[A-Z]+`
// backtracks one character at a time, and the lookahead fails at every
// step, for every starting position within the run.
class CamelCase {
  private static isUpper(char: string): boolean {
    const result = char >= 'A' && char <= 'Z';

    return result;
  }

  private static isLower(char: string): boolean {
    const result = char >= 'a' && char <= 'z';

    return result;
  }

  public static split(name: string): string[] {
    const tokens: string[] = [];
    const length = name.length;
    let i = 0;

    while (i < length) {
      const char = name.at(i)!;

      if (CamelCase.isLower(char)) {
        let j = i + 1;

        while (j < length && CamelCase.isLower(name.at(j)!)) {
          j += 1;
        }
        tokens.push(name.slice(i, j));
        i = j;
        continue;
      }

      if (CamelCase.isUpper(char)) {
        if (i + 1 < length && CamelCase.isLower(name.at(i + 1)!)) {
          let j = i + 2;

          while (j < length && CamelCase.isLower(name.at(j)!)) {
            j += 1;
          }
          tokens.push(name.slice(i, j));
          i = j;
          continue;
        }

        let j = i + 1;

        while (j < length && CamelCase.isUpper(name.at(j)!)) {
          j += 1;
        }
        if (j < length && CamelCase.isLower(name.at(j)!) && j - i > 1) {
          tokens.push(name.slice(i, j - 1));
          i = j - 1;
        } else {
          tokens.push(name.slice(i, j));
          i = j;
        }
        continue;
      }

      i += 1;
    }

    return tokens;
  }
}

class BannedToken {
  public static find(name: string): string | undefined {
    if (BannedToken.#endsWithExternalGlobalTypeName(name)) {
      return undefined;
    }

    const tokens = CamelCase.split(name);
    const tokensLength = tokens.length;

    for (let index = 0; index < tokensLength; index += 1) {
      const token = tokens.at(index);
      const lowered = token?.toLowerCase();

      if (lowered !== undefined && BANNED_SHORTENINGS.has(lowered)) {
        return lowered;
      }
    }

    return undefined;
  }

  static #endsWithExternalGlobalTypeName(name: string): boolean {
    const suffixCount = EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES.length;

    for (let index = 0; index < suffixCount; index += 1) {
      const suffix = EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES[index];

      if (suffix !== undefined && name.endsWith(suffix)) {
        return true;
      }
    }

    return false;
  }
}

// An object property can be dictated by an external API rather than chosen by the
// project. Report its key only when the checker proves that its contextual declaration
// belongs to this package; absent provenance is not safe evidence for a rename.
class ExternalPropertyProvenance {
  public static shouldSkip(node: Rule.Node, name: string, context: Rule.RuleContext): boolean {
    const services: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(services)) {
      const result = ExternalPropertyProvenance.isObjectProperty(node);

      return result;
    }
    const property = services.esTreeNodeToTSNodeMap.get(node);

    if (property === undefined || !isObjectLiteralExpression(property.parent)) {
      const result = ExternalPropertyProvenance.isObjectProperty(node);

      return result;
    }
    const checker = services.program.getTypeChecker();
    const contextualType = checker.getContextualType(property.parent);

    if (contextualType === undefined) {
      return true;
    }
    const symbols = ExternalPropertyProvenance.propertiesNamed(contextualType, name, checker);

    if (symbols.length === 0) {
      return true;
    }
    const result = symbols.every((symbol) => {
      const matches = ExternalPropertyProvenance.isDeclaredOutsideCurrentPackage(symbol, property.getSourceFile(), services.program);

      return matches;
    });

    return result;
  }

  private static isObjectProperty(node: Rule.Node): boolean {
    const result = node.type === 'Property';

    return result;
  }

  private static propertiesNamed(type: Type, name: string, checker: TypeChecker): readonly Symbol[] {
    const property = checker.getPropertyOfType(type, name);

    if (property !== undefined) {
      const result = [property];

      return result;
    }
    if (!type.isUnionOrIntersection()) {
      return [];
    }
    const properties = new Set<Symbol>();
    const constituentCount = type.types.length;

    for (let index = 0; index < constituentCount; index += 1) {
      const constituentProperties = ExternalPropertyProvenance.propertiesNamed(type.types[index]!, name, checker);
      const propertyCount = constituentProperties.length;

      for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
        const constituentProperty = constituentProperties[propertyIndex]!;

        properties.add(constituentProperty);
      }
    }

    const result = [...properties];

    return result;
  }

  private static isDeclaredOutsideCurrentPackage(symbol: Symbol, currentSource: SourceFile, program: Program): boolean {
    const currentPackage = PackageBoundary.rootFor(currentSource, program);
    const declarations = symbol.getDeclarations() ?? [];

    if (currentPackage === undefined || declarations.length === 0) {
      return false;
    }

    const everyDeclarationIsExternal = declarations.every((declaration) => {
      const declarationSource = declaration.getSourceFile();

      if (program.isSourceFileDefaultLibrary(declarationSource)) {
        const result = true;

        return result;
      }
      const declarationPackage = PackageBoundary.rootFor(declarationSource, program);

      const result = declarationPackage !== undefined && declarationPackage !== currentPackage;

      return result;
    });

    return everyDeclarationIsExternal;
  }
}

// `quote-props` represents quoted keys as literals. This keeps quoted identifiers in
// scope while leaving opaque string keys such as rule IDs and URLs alone.
class KeyName {
  public static extract(node: Rule.Node, context: Rule.RuleContext): string | undefined {
    const key = AstHelpers.getNodeProperty(node, 'key');
    const identifierName = AstHelpers.getIdentifierName(key);

    if (identifierName !== undefined) {
      const result = ExternalPropertyProvenance.shouldSkip(node, identifierName, context) ? undefined : identifierName;

      return result;
    }
    if (!Predicates.isRecord(key) || key.type !== 'Literal') {
      return undefined;
    }

    const { value } = key;

    if (typeof value !== 'string' || !IDENTIFIER_NAME_PATTERN.test(value)) {
      return undefined;
    }

    const result = ExternalPropertyProvenance.shouldSkip(node, value, context) ? undefined : value;

    return result;
  }
}

class ViolationReporter {
  public static reportIfBanned(
    name: string,
    node: Rule.Node,
    context: Rule.RuleContext
  ): void {
    const bannedToken = BannedToken.find(name);

    if (bannedToken !== undefined) {
      context.report({
        'data': {
          'name': name,
          'token': bannedToken
        },
        'messageId': 'banned-shortening',
        'node': node
      });
    }
  }
}

class DescriptiveIdentifiers {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    function onNodeWithId(node: Rule.Node): void {
      const name = AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(node, 'id'));

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    function onIdentifier(node: Rule.Node): void {
      const parent: unknown = AstHelpers.getNodeProperty(node, 'parent');

      if (!Predicates.isRecord(parent)) {
        return;
      }
      const parentType: unknown = parent.type;

      // `FunctionDeclaration`/`VariableDeclarator` are exempted here only for their own `.id` node
      // (already reported separately by `onNodeWithId`/`onNodeWithKey`) — never for the whole
      // parent type, or bare parameters of a named `function process(cb, ctx) {}` would be
      // invisible to this rule (its own `.id` exemption accidentally swallowing `.params` too).
      if (
        (parentType === 'FunctionDeclaration' || parentType === 'VariableDeclarator')
        && parent.id === node
      ) {
        return;
      }
      if (
        parentType === 'ExportSpecifier'
        || parentType === 'MethodDefinition'
        || parentType === 'Property'
        || parentType === 'PropertyDefinition'
        || parentType === 'TSEnumMember'
        || parentType === 'TSMethodSignature'
        || parentType === 'TSPropertySignature'
        || parentType === 'TSTypeParameter'
      ) {
        return;
      }
      if (parentType === 'MemberExpression') {
        const computed: unknown = parent.computed;
        const property: unknown = parent.property;

        if (computed === false && property === node) {
          return;
        }
      }

      const name = AstHelpers.getIdentifierName(node);

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    function onNodeWithKey(node: Rule.Node): void {
      const name = KeyName.extract(node, context);

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    function onTSTypeParameter(node: Rule.Node): void {
      const name = AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(node, 'name'));

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    return {
      'FunctionDeclaration': onNodeWithId,
      'Identifier': onIdentifier,
      'MethodDefinition': onNodeWithKey,
      'Property': onNodeWithKey,
      'PropertyDefinition': onNodeWithKey,
      'TSEnumMember': onNodeWithId,
      'TSMethodSignature': onNodeWithKey,
      'TSPropertySignature': onNodeWithKey,
      'TSTypeParameter': onTSTypeParameter,
      'VariableDeclarator': onNodeWithId
    };
  }
}

// NO FIXER, BY DESIGN — NOT AN OVERSIGHT.
//
// Standing policy: an autofixer may exist only for a transformation that is
// GUARANTEED safe; any residual risk means no fixer at all. A rename here is
// not mechanical — it requires renaming the DECLARATION and every USE SITE of
// the identifier, sitewide and possibly cross-file for an exported name, and
// the message's suggested replacement (`cb`→`callback`, etc.) is a single
// heuristic guess per banned token that can collide with an existing binding
// already in scope. Same risk category, same standing policy, as
// `inline-trivial-logic`'s "inline the logic at the call site" and
// `explicitReturnBinding.ts`'s deleted fixer (see that file's "NO FIXER"
// note) — a human renames each violation by hand.
export const descriptiveIdentifiers: Rule.RuleModule = {
  'create': DescriptiveIdentifiers.create,
  'meta': {
    'docs': {
      'description': 'Bans internal shorthand identifiers (cb, dlq, cfg, opts, ctx, idx, etc.) in favour of descriptive names.',
      'recommended': false
    },
    'messages': { 'banned-shortening': 'Identifier \'{{name}}\' contains the banned shortening \'{{token}}\'. Rename to a descriptive form. Suggested replacements: cb→callback, dlq→deadLetterQueue, cfg→config, opts→options, ctx→context, idx→index, mgr→manager, svc→service, lst→list, val→value, tmp→temporary, fn→function, ret→returnValue, err→error, msg→message, args→argumentList, params→parameters, prev→previous, curr→current, nxt→next, doc→document, env→environment, src→source, dst→destination, num→number, str→string, obj→object, arr→array, len→length, cnt→count, buf→buffer, ptr→pointer, ref→reference, repo→repository, conf→configuration.' },
    'schema': [],
    'type': 'problem'
  }
};
