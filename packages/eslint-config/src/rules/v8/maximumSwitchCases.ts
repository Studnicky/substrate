import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import {
  BLOCK_TYPES, MAXIMUM_INT_SWITCH_CASES, MAXIMUM_STRING_SWITCH_CASES, MAXIMUM_SWITCH_CASES_DEFAULT
} from './constants/MaximumSwitchCasesConstants.js';

// Per-count threshold numbers and benchmark method: MaximumSwitchCasesConstants.ts.
// Classifies syntactically from case labels, no type-checker dependency needed.

// Not a named `type` alias: `@studnicky/type-alias-invariants` requires a top-level
// `type X = ...` to be schema-derived canonical data; written out inline instead.

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

/** Structural equality key for a discriminant; scope and rationale: docs/eslint/rules/v8/max-switch-cases.md. */
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

      const result = DiscriminantKey.#computeProperty(node.property, node.computed === true, objectKey);

      return result;
    }

    return null;
  }

  static #computeProperty(property: unknown, computed: boolean, objectKey: string): string | null {
    if (!Predicates.isRecord(property)) {
      return null;
    }

    if (computed) {
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
}

class SwitchGroupRegistry {
  readonly #groups = new Map<Rule.Node, Map<string | Rule.Node, SwitchGroup>>();

  /** A switch with an unresolvable discriminant uses the switch node itself as a singleton key. */
  public groupFor(block: Rule.Node, key: string | Rule.Node): SwitchGroup {
    let byKey = this.#groups.get(block);

    if (byKey === undefined) {
      byKey = new Map<string | Rule.Node, SwitchGroup>();
      this.#groups.set(block, byKey);
    }

    let group = byKey.get(key);

    if (group === undefined) {
      group = new SwitchGroup();
      byKey.set(key, group);
    }

    return group;
  }

  public values(): IterableIterator<Map<string | Rule.Node, SwitchGroup>> {
    const result = this.#groups.values();

    return result;
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
    const groups = new SwitchGroupRegistry();

    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const cases = node.cases;

      if (!Array.isArray(cases)) {
        return;
      }

      const nonDefaultCount = cases.filter((c: unknown) => {
        const result = Predicates.isRecord(c) && c.test !== null;

        return result;
      }).length;

      const block = SwitchScope.nearestEnclosingBlock(node);
      const key: string | Rule.Node = DiscriminantKey.compute(node.discriminant) ?? node;
      const group = groups.groupFor(block, key);

      // Kind is fixed from the first switch seen for this discriminant; a
      // disagreeing later switch keeps the group's original kind.
      if (!group.kindSet) {
        group.kind = DiscriminantKind.classify(cases);
        group.kindSet = true;
      }

      group.members.push(node);
      group.total += nonDefaultCount;
    };

    const reportIfOverThreshold = (group: SwitchGroup): void => {
      const maximum = DiscriminantKind.maximumCasesFor(group.kind);

      if (maximum === null) {
        return;
      } // int-keyed: no cap, see MaximumSwitchCasesConstants.ts

      if (group.total < maximum) {
        return;
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
    };

    const onProgramExit = (): void => {
      for (const byKey of groups.values()) {
        for (const group of byKey.values()) {
          reportIfOverThreshold(group);
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
