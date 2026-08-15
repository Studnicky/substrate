import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { BLOCK_TYPES, MAX_SWITCH_CASES } from './constants/MaxSwitchCasesConstants.js';

class SwitchGroup {
  public members: Rule.Node[] = [];
  public total = 0;
}

/**
 * Resolves a discriminant expression to a structural equality key, so two
 * `switch` statements testing the *same* value — not merely textually
 * identical source — are recognized as splitting one dispatch decision.
 * Deliberately narrow: only `Identifier`, `ThisExpression`, and
 * non-computed/literal-computed `MemberExpression` chains built from those
 * are resolved. Anything more complex (call expressions, computed access
 * with a non-literal key, binary expressions, etc.) returns `null` and is
 * therefore never merged with another switch — avoiding false positives
 * from two switches that merely *look* similar but discriminate on
 * different runtime values.
 */
class DiscriminantKey {
  public static compute(node: unknown): string | null {
    if (!ObjectGuard.isObject(node)) { return null; }

    if (node.type === 'Identifier') {
      return typeof node.name === 'string' ? `id:${node.name}` : null;
    }

    if (node.type === 'ThisExpression') { return 'this'; }

    if (node.type === 'MemberExpression') {
      const objectKey = DiscriminantKey.compute(node.object);
      if (objectKey === null) { return null; }

      const property = node.property;
      if (!ObjectGuard.isObject(property)) { return null; }

      if (node.computed === true) {
        if (property.type !== 'Literal') { return null; }
        const value = property.value;
        if (typeof value !== 'string' && typeof value !== 'number') { return null; }
        return `${objectKey}[${String(value)}]`;
      }

      if (property.type !== 'Identifier' || typeof property.name !== 'string') { return null; }
      return `${objectKey}.${property.name}`;
    }

    return null;
  }
}

class SwitchScope {
  /** Nearest ancestor block-like node — the boundary within which sibling switches on the same discriminant are aggregated. */
  public static nearestEnclosingBlock(node: Rule.Node): Rule.Node {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (BLOCK_TYPES.has(current.type)) { return current; }
      current = current.parent;
    }

    // Unreachable in practice: the Program node always matches BLOCK_TYPES
    // and terminates the walk before parent becomes null.
    return node;
  }
}

export const maxSwitchCases: Rule.RuleModule = {
  'create': (context) => {
    // Keyed by enclosing block, then by discriminant key — switches with an
    // unresolvable (complex) discriminant use the switch node itself as a
    // singleton key, so they behave exactly as a standalone switch always did.
    const groups = new Map<Rule.Node, Map<string | Rule.Node, SwitchGroup>>();

    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const cases: unknown = rawNode.cases;

      if (!Array.isArray(cases)) { return; }

      const nonDefaultCount = cases.filter((c: unknown) => {
        return ObjectGuard.isObject(c) && c.test !== null;
      }).length;

      const block = SwitchScope.nearestEnclosingBlock(node);
      const key: string | Rule.Node = DiscriminantKey.compute(rawNode.discriminant) ?? node;

      let byKey = groups.get(block);
      if (byKey === undefined) {
        byKey = new Map<string | Rule.Node, SwitchGroup>();
        groups.set(block, byKey);
      }

      let group = byKey.get(key);
      if (group === undefined) {
        group = new SwitchGroup();
        byKey.set(key, group);
      }

      group.members.push(node);
      group.total += nonDefaultCount;
    };

    const onProgramExit = (): void => {
      for (const byKey of groups.values()) {
        for (const group of byKey.values()) {
          if (group.total < MAX_SWITCH_CASES) { continue; }

          const grouped = group.members.length > 1;
          const { members } = group;
          const membersLength = members.length;
          for (let index = 0; index < membersLength; index += 1) {
            const member = members.at(index);
            if (member === undefined) { continue; }
            context.report({
              'data': { 'count': String(group.total), 'max': String(MAX_SWITCH_CASES) },
              'messageId': grouped ? 'tooManyCasesGrouped' : 'tooManyCases',
              'node': member
            });
          }
        }
      }
    };

    return {
      'Program:exit': onProgramExit,
      'SwitchStatement': onSwitchStatement
    };
  },
  'meta': {
    'docs': {
      'description': `Switch statements with ${MAX_SWITCH_CASES}+ cases (counted per discriminant across sibling switches in the same block) must become a dispatch map instead — measured slower than a dispatch map at that scale, faster below it.`,
      'recommended': false
    },
    'messages': {
      'tooManyCases': 'v8Optimization/maxSwitchCases: switch has {{count}} cases (limit {{max}}). At this scale a dispatch map (Record<key, handler>) measures faster on Node v24 — convert this switch to a dispatch map. Below {{max}} cases, switch is measurably faster and should be kept.',
      'tooManyCasesGrouped': 'v8Optimization/maxSwitchCases: {{count}} cases (limit {{max}}) across sibling switch statements on the same discriminant in this block. Splitting one dispatch decision across multiple switches does not avoid the dispatch-map threshold — merge them or convert to a dispatch map.'
    },
    'schema': [],
    'type': 'problem'
  }
};
