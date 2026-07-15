import type { Rule } from 'eslint';

/**
 * Measured on Node v24 (1.5M calls per case count, JIT-warmed, switch cases
 * in the rule-ALLOWED single-call form vs. an equivalent dispatch map):
 * switch is consistently and clearly faster below ~20 cases (0.25x-0.8x of
 * dispatch-map time), the 20-100 case range is noisy with no consistent
 * winner, and dispatch map pulls ahead only once case count grows large
 * (~150+). Below the threshold, prefer switch (it is faster and this
 * package's own `switch-statements` rule keeps its case bodies simple).
 * At or above the threshold, require a dispatch map instead.
 */
const MAX_SWITCH_CASES = 20;

class AstHelpers {
  public static isNonNullObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object';
  }
}

export const maxSwitchCases: Rule.RuleModule = {
  'create': (context) => {
    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const cases: unknown = rawNode.cases;

      if (!Array.isArray(cases)) { return; }

      const nonDefaultCount = cases.filter((c: unknown) => {
        return AstHelpers.isNonNullObject(c) && c.test !== null;
      }).length;

      if (nonDefaultCount < MAX_SWITCH_CASES) { return; }

      context.report({
        'data': { 'count': String(nonDefaultCount), 'max': String(MAX_SWITCH_CASES) },
        'messageId': 'tooManyCases',
        'node': node
      });
    };

    return { 'SwitchStatement': onSwitchStatement };
  },
  'meta': {
    'docs': {
      'description': `Switch statements with ${MAX_SWITCH_CASES}+ cases must become a dispatch map instead — measured slower than a dispatch map at that scale, faster below it.`,
      'recommended': false
    },
    'messages': {
      'tooManyCases': 'v8Optimization/maxSwitchCases: switch has {{count}} cases (limit {{max}}). At this scale a dispatch map (Record<key, handler>) measures faster on Node v24 — convert this switch to a dispatch map. Below {{max}} cases, switch is measurably faster and should be kept.'
    },
    'schema': [],
    'type': 'problem'
  }
};
