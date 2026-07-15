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

const reportUnderscoreName = (context: Rule.RuleContext, node: Rule.Node, name: string): void => {
  context.report({ 'data': { 'name': name }, 'messageId': 'forbidden', 'node': node });
};

const onClassMember = (context: Rule.RuleContext, node: Record<string, unknown>): void => {
  const name = UnderscoreName.get(node);
  if (name === undefined) { return; }

  reportUnderscoreName(context, node.key as Rule.Node, name);
};

const unwrapParameterIdentifier = (parameter: unknown): Record<string, unknown> | undefined => {
  if (!isNonNullObject(parameter)) { return undefined; }
  if (Reflect.get(parameter, 'type') !== 'AssignmentPattern') { return parameter; }

  const left: unknown = Reflect.get(parameter, 'left');
  return isNonNullObject(left) ? left : undefined;
};

const isDeclaredField = (node: Record<string, unknown>): boolean => {
  return Reflect.get(node, 'accessibility') !== undefined || Reflect.get(node, 'readonly') === true;
};

const onParameterProperty = (context: Rule.RuleContext, node: unknown): void => {
  if (!isNonNullObject(node)) { return; }
  if (!isDeclaredField(node)) { return; }

  const identifier = unwrapParameterIdentifier(Reflect.get(node, 'parameter'));
  if (identifier === undefined) { return; }
  if (Reflect.get(identifier, 'type') !== 'Identifier') { return; }

  const name: unknown = Reflect.get(identifier, 'name');
  if (typeof name !== 'string' || !name.startsWith('_')) { return; }

  reportUnderscoreName(context, identifier as unknown as Rule.Node, name);
};

export const noUnderscorePrivate: Rule.RuleModule = {
  'create': (context) => {
    const onMethodDefinition = (node: unknown): void => { onClassMember(context, node as Record<string, unknown>); };
    const onPropertyDefinition = (node: unknown): void => { onClassMember(context, node as Record<string, unknown>); };
    const onTSParameterProperty = (node: unknown): void => { onParameterProperty(context, node); };

    return {
      'MethodDefinition': onMethodDefinition,
      'PropertyDefinition': onPropertyDefinition,
      'TSParameterProperty': onTSParameterProperty
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
