import type { Rule } from 'eslint';

export class SelectorRule {
  public static create(ruleName: string, selector: string, message: string): Rule.RuleModule {
    const create: NonNullable<Rule.RuleModule['create']> = (context) => {
      const listeners: Record<string, (node: Rule.Node) => void> = {};
      const reportForbidden = (node: Rule.Node): void => {
        context.report({
          'messageId': 'forbidden',
          'node': node
        });
      };

      listeners[selector] = reportForbidden;

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
