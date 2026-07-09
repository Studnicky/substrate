import type { Rule } from 'eslint';

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object';};

class UnderscoreName {
  public static get(node: unknown): string | undefined {
    if (!isNonNullObject(node)) { return undefined; }
    if (Reflect.get(node, 'computed') === true) { return undefined; }

    const key: unknown = Reflect.get(node, 'key');
    if (!isNonNullObject(key)) { return undefined; }
    if (Reflect.get(key, 'type') !== 'Identifier') { return undefined; }

    const name: unknown = Reflect.get(key, 'name');
    if (typeof name !== 'string' || !name.startsWith('_')) { return undefined; }

    return name;
  }
}

const onClassMember = (context: Rule.RuleContext, node: Record<string, unknown>): void => {
  const name = UnderscoreName.get(node);
  if (name === undefined) { return; }

  context.report({ 'data': { 'name': name }, 'messageId': 'forbidden', 'node': node.key as Rule.Node });
};

export const noUnderscorePrivate: Rule.RuleModule = {
  'create': (context) => {
    const onMethodDefinition = (node: unknown): void => { onClassMember(context, node as Record<string, unknown>); };
    const onPropertyDefinition = (node: unknown): void => { onClassMember(context, node as Record<string, unknown>); };

    return {
      'MethodDefinition': onMethodDefinition,
      'PropertyDefinition': onPropertyDefinition
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow underscore-prefixed class members; use real `#private` fields/methods instead.',
      'recommended': false
    },
    'messages': {
      'forbidden': '"{{name}}" uses the underscore-private convention. Use a real `#{{name}}`-style private field or method instead.'
    },
    'schema': [],
    'type': 'problem'
  }
};
