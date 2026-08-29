import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import {
  BLOCK_TYPES, MAXIMUM_INT_SWITCH_CASES, MAXIMUM_STRING_SWITCH_CASES, MAXIMUM_SWITCH_CASES_DEFAULT
} from './constants/MaximumSwitchCasesConstants.js';

// Re-measure command (Node v24): scratchpad bench comparing a generated N-case
// switch against an equivalent `Record<key, handler>` dispatch map, 5,000,000
// dispatches, 3 warm-up calls + median of 7. See MaximumSwitchCasesConstants.ts
// for the per-count numbers this threshold split is built from.
//
// The rule's original single MAX_SWITCH_CASES=20 threshold was wrong in BOTH
// directions at once, because it never looked at what the switch discriminates
// ON:
//   - integer-keyed switches never need a cap (switch wins or ties at every
//     measured count, 3 through 100 cases) — the old threshold forced a
//     needless, slower rewrite at 20 cases.
//   - string-keyed switches cross over to a slower switch by 6 cases, not
//     20 — the old threshold let 14 genuinely-slower cases (6-19) through
//     uncaught.
//
// `DiscriminantKind` below resolves which regime a switch is in from its own
// case labels (syntactic, no type-checker dependency — literal `case 1:` /
// `case 'x':` values are unambiguous without one).

// Not a named `type` alias: `@studnicky/type-alias-invariants` requires any
// top-level `type X = ...` to be schema-derived canonical data, which a
// private three-value dispatch tag is not. The union is written out inline
// at each of its three use sites instead (`classify`'s return type,
// `maximumCasesFor`'s parameter, and `SwitchGroup.kind`'s field type).

class DiscriminantKind {
  /** Classifies a switch by its own non-default case test literal types — not the discriminant expression's static type. */
  public static classify(cases: readonly unknown[]): 'int' | 'string' | 'other' {
    const literalValues: unknown[] = [];
    const casesLength = cases.length;

    for (let index = 0; index < casesLength; index += 1) {
      const c = cases.at(index);

      if (!Predicates.isRecord(c)) {
        continue;
      }
      const test = c.test;

      if (test === null || test === undefined) {
        continue;
      }
      if (!Predicates.isRecord(test) || test.type !== 'Literal') {
        return 'other';
      }
      literalValues.push(test.value);
    }

    if (literalValues.length === 0) {
      return 'other';
    }
    if (literalValues.every((v) => {
      const result = typeof v === 'number' && Number.isInteger(v);

      return result;
    })) {
      return 'int';
    }
    if (literalValues.every((v) => {
      const result = typeof v === 'string';

      return result;
    })) {
      return 'string';
    }

    return 'other';
  }

  public static maximumCasesFor(kind: 'int' | 'string' | 'other'): number | null {
    if (kind === 'int') {
      return MAXIMUM_INT_SWITCH_CASES;
    }
    if (kind === 'string') {
      return MAXIMUM_STRING_SWITCH_CASES;
    }

    return MAXIMUM_SWITCH_CASES_DEFAULT;
  }
}

class SwitchGroup {
  public members: Rule.Node[] = [];
  public total = 0;
  public kind: 'int' | 'string' | 'other' = 'other';
  public kindSet = false;
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
    if (!Predicates.isRecord(node)) {
      return null;
    }

    if (node.type === 'Identifier') {
      const result = typeof node.name === 'string' ? `id:${node.name}` : null;

      return result;
    }

    if (node.type === 'ThisExpression') {
      return 'this';
    }

    if (node.type === 'MemberExpression') {
      const objectKey = DiscriminantKey.compute(node.object);

      if (objectKey === null) {
        return null;
      }

      const property = node.property;

      if (!Predicates.isRecord(property)) {
        return null;
      }

      if (node.computed === true) {
        if (property.type !== 'Literal') {
          return null;
        }
        const value = property.value;

        if (typeof value !== 'string' && typeof value !== 'number') {
          return null;
        }

        return `${objectKey}[${String(value)}]`;
      }

      if (property.type !== 'Identifier' || typeof property.name !== 'string') {
        return null;
      }

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
      if (BLOCK_TYPES.has(current.type)) {
        return current;
      }
      current = current.parent;
    }

    // Unreachable in practice: the Program node always matches BLOCK_TYPES
    // and terminates the walk before parent becomes null.
    return node;
  }
}

export const maximumSwitchCases: Rule.RuleModule = {
  'create': (context) => {
    // Keyed by enclosing block, then by discriminant key — switches with an
    // unresolvable (complex) discriminant use the switch node itself as a
    // singleton key, so they behave exactly as a standalone switch always did.
    const groups = new Map<Rule.Node, Map<string | Rule.Node, SwitchGroup>>();

    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const cases: unknown = rawNode.cases;

      if (!Array.isArray(cases)) {
        return;
      }

      const nonDefaultCount = cases.filter((c: unknown) => {
        const result = Predicates.isRecord(c) && c.test !== null;

        return result;
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

      // Kind is fixed from the FIRST switch seen for this discriminant. Sibling
      // switches on the same discriminant should share a value type by
      // construction (they discriminate on the same variable); if a later
      // switch disagrees this simplification just keeps the group's original
      // kind rather than re-classifying mid-aggregation.
      if (!group.kindSet) {
        group.kind = DiscriminantKind.classify(cases);
        group.kindSet = true;
      }

      group.members.push(node);
      group.total += nonDefaultCount;
    };

    const onProgramExit = (): void => {
      for (const byKey of groups.values()) {
        for (const group of byKey.values()) {
          const maximum = DiscriminantKind.maximumCasesFor(group.kind);

          if (maximum === null) {
            continue;
          } // int-keyed: no cap, see MaximumSwitchCasesConstants.ts

          if (group.total < maximum) {
            continue;
          }

          const grouped = group.members.length > 1;
          const { members } = group;
          const membersLength = members.length;

          for (let index = 0; index < membersLength; index += 1) {
            const member = members.at(index);

            if (member === undefined) {
              continue;
            }
            context.report({
              'data': {
                'count': String(group.total), 'kind': group.kind, 'maximum': String(maximum)
              },
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
      'description': 'Switch statements over a threshold of cases (counted per discriminant across sibling switches in the same block) must become a dispatch map instead. The threshold depends on the discriminant\'s value type: no cap for dense integer case labels (switch wins or ties a dispatch map at every measured count), 6+ for string case labels (crosses over to a slower switch quickly), 20+ as an unproven fallback for anything else.',
      'recommended': false
    },
    'messages': {
      'tooManyCases': 'v8Optimization/maxSwitchCases: {{kind}}-keyed switch has {{count}} cases (limit {{maximum}}). At this scale a dispatch map (Record<key, handler>) measures faster on Node v24 — convert this switch to a dispatch map.',
      'tooManyCasesGrouped': 'v8Optimization/maxSwitchCases: {{kind}}-keyed, {{count}} cases (limit {{maximum}}) across sibling switch statements on the same discriminant in this block. Splitting one dispatch decision across multiple switches does not avoid the dispatch-map threshold — merge them or convert to a dispatch map.'
    },
    'schema': [],
    'type': 'problem'
  }
};
