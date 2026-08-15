import type { Rule } from 'eslint';

import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

const BANNED_SHORTENINGS = new Set([
  'args',
  'arr',
  'buf',
  'cb',
  'cfg',
  'cnt',
  'conf',
  'ctx',
  'curr',
  'dlq',
  'doc',
  'dst',
  'env',
  'err',
  'fn',
  'idx',
  'kv',
  'len',
  'lst',
  'max',
  'mgr',
  'min',
  'mq',
  'msg',
  'num',
  'nxt',
  'obj',
  'opts',
  'params',
  'prev',
  'ptr',
  'rcv',
  'ref',
  'repo',
  'ret',
  'snd',
  'src',
  'str',
  'svc',
  'tmp',
  'util',
  'utils',
  'val'
]);

// Manual scan instead of a single backtracking regex: the equivalent
// `/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g` is polynomial-time on an
// uppercase run followed by a non-letter, non-end character (e.g. a long
// run of capitals immediately before a digit) — the greedy `[A-Z]+`
// backtracks one character at a time, and the lookahead fails at every
// step, for every starting position within the run.
class CamelCase {
  private static isUpper(char: string): boolean {
    return char >= 'A' && char <= 'Z';
  }

  private static isLower(char: string): boolean {
    return char >= 'a' && char <= 'z';
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
    const tokens = CamelCase.split(name);
    const found = tokens.find((token) => { const result = BANNED_SHORTENINGS.has(token.toLowerCase());
      return result; });

    return found !== undefined ? found.toLowerCase() : undefined;
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
    function getNodeProperty(node: Rule.Node, property: string): unknown {
      const nodeAsObject: unknown = node;

      return ObjectGuard.isObject(nodeAsObject) ? Reflect.get(nodeAsObject, property) : undefined;
    }

    function onNodeWithId(node: Rule.Node): void {
      const name = AstHelpers.getIdentifierName(getNodeProperty(node, 'id'));

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    function onIdentifier(node: Rule.Node): void {
      const parent: unknown = getNodeProperty(node, 'parent');

      if (!ObjectGuard.isObject(parent)) {
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
      const name = AstHelpers.getIdentifierName(getNodeProperty(node, 'key'));

      if (name !== undefined) {
        ViolationReporter.reportIfBanned(name, node, context);
      }
    }

    function onTSTypeParameter(node: Rule.Node): void {
      const name = AstHelpers.getIdentifierName(getNodeProperty(node, 'name'));

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
