import type { Rule } from 'eslint';

import { JsonObject } from '#runtime';


export class SelectorRule {
  public static create(ruleName: string, selector: string, message: string): Rule.RuleModule {
    const create: NonNullable<Rule.RuleModule['create']> = (context) => {
      const reportForbidden = (node: Rule.Node): void => {
        context.report({
          'messageId': 'forbidden',
          'node': node
        });
      };

      const listeners = JsonObject.fromEntries<(node: Rule.Node) => void>([[selector, reportForbidden]]);

      return listeners;
    };

    return {
      'create': create,
      'meta': {
        'docs': {
          'description': message,
          'recommended': false
        },
        'messages': { 'forbidden': `${ruleName}: ${message}` },
        'schema': [],
        'type': 'problem'
      }
    };
  }
}
