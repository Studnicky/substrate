import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import {
  BANNED_SHORTENINGS, EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES, EXTERNAL_VOCABULARY_KEYS, IDENTIFIER_NAME_PATTERN
} from './constants/DescriptiveIdentifiersConstants.js';
import { AstHelpers } from './shared/astHelpers.js';

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

// THE BLIND SPOT THIS CLASS CLOSES.
//
// `AstHelpers.getIdentifierName` reads only `node.name` — correct for an
// `Identifier`, but a key forced into quotes is a `Literal` node instead, and
// `Literal` has no `.name`. `eslint.config.mjs` sets
// `@stylistic/quote-props: ['error', 'always']`, which forces EVERY object
// key — every `Property`/class-member key this rule inspects via
// `onNodeWithKey` — into that shape. Before this fix, `{ cb: fn }` (unquoted,
// pre-quote-props) was checked; `{ 'cb': fn }` (what quote-props actually
// requires) was invisible, making the `Property`/`PropertyDefinition`/
// `MethodDefinition`/`TSPropertySignature`/`TSMethodSignature` paths
// permanently blind for their entire configured lifetime.
//
// `AstHelpers.getIdentifierName` itself is a `shared/` module used by other
// rules and out of this rule's ownership scope — this key-specific extension
// stays local to `descriptive-identifiers` rather than changing shared
// behavior other rules depend on. It tries the `Identifier` shape first
// (unchanged behavior for every non-quoted-key call site: `onNodeWithId`,
// `onIdentifier`, `onTSTypeParameter` are untouched), then falls back to a
// string-valued `Literal` — deliberately NOT a numeric literal (`{ 5: x }`),
// which is an index, not a name, and carries no shortening to flag.
//
// THE OVER-CORRECTION THAT FIX INTRODUCED, AND WHY THIS CHECKS IDENTIFIER SHAPE.
//
// Reading `Literal.value` for every quoted key also picks up a key that is a
// string ONLY because it needed to be one — an ESLint rule id
// (`'@studnicky/v8/max-switch-cases'`), a URL, a file path, anything foreign
// with no author-chosen "identifier" reading at all. `max-switch-cases`
// contains `max` only because `-` glued unrelated words together; it is not
// camelCase/PascalCase the way `cb`/`ctx`/`opts` are, and CamelCase.split
// would butcher it regardless. A quoted key that IS a valid JavaScript
// identifier (`'cb'`, `'ctx'`) is "an identifier the author chose, merely
// quoted (by quote-props)" and stays in scope; a quoted key that is NOT a
// valid identifier (contains `@`, `/`, `-`, a leading digit, whitespace, …)
// is a foreign/opaque string key and is out of scope, same as any other
// string literal this rule never inspects.
class KeyName {
  public static extract(node: unknown): string | undefined {
    const identifierName = AstHelpers.getIdentifierName(node);

    if (identifierName !== undefined) {
      return identifierName;
    }
    if (!Predicates.isRecord(node) || node.type !== 'Literal') {
      return undefined;
    }

    const { value } = node;

    if (typeof value !== 'string' || !IDENTIFIER_NAME_PATTERN.test(value)) {
      return undefined;
    }
    // External-vocabulary keys (JSON Schema) are not author-chosen identifiers. Renaming
    // `'minLength'` in a Schema breaks validation rather than improving a name, and no
    // compliant rewrite exists — see EXTERNAL_VOCABULARY_KEYS for the full reasoning.
    if (EXTERNAL_VOCABULARY_KEYS.has(value)) {
      return undefined;
    }

    return value;
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
      const name = KeyName.extract(AstHelpers.getNodeProperty(node, 'key'));

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
