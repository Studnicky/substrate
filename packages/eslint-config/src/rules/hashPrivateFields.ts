import type { Rule } from 'eslint';

import { ObjectGuard } from './shared/ObjectGuard.js';

class UnderscoreName {
  public static get(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    if (Reflect.get(node, 'computed') === true) { return undefined; }

    const key: unknown = Reflect.get(node, 'key');
    if (!ObjectGuard.isObject(key)) { return undefined; }
    if (Reflect.get(key, 'type') !== 'Identifier') { return undefined; }

    const name: unknown = Reflect.get(key, 'name');
    if (typeof name !== 'string' || !name.startsWith('_')) { return undefined; }

    return name;
  }
}

class ViolationReporter {
  public static reportUnderscoreName(context: Rule.RuleContext, node: Rule.Node, name: string): void {
    context.report({ 'data': { 'name': name }, 'messageId': 'forbidden', 'node': node });
  }
}

class ClassMemberCheck {
  public static onClassMember(context: Rule.RuleContext, node: Record<string, unknown>): void {
    const name = UnderscoreName.get(node);
    if (name === undefined) { return; }

    ViolationReporter.reportUnderscoreName(context, node.key as Rule.Node, name);
  }

  public static unwrapParameterIdentifier(parameter: unknown): Record<string, unknown> | undefined {
    if (!ObjectGuard.isObject(parameter)) { return undefined; }
    if (Reflect.get(parameter, 'type') !== 'AssignmentPattern') { return parameter; }

    const left: unknown = Reflect.get(parameter, 'left');
    return ObjectGuard.isObject(left) ? left : undefined;
  }

  public static isDeclaredField(node: Record<string, unknown>): boolean {
    return Reflect.get(node, 'accessibility') !== undefined || Reflect.get(node, 'readonly') === true;
  }

  public static onParameterProperty(context: Rule.RuleContext, node: unknown): void {
    if (!ObjectGuard.isObject(node)) { return; }
    if (!ClassMemberCheck.isDeclaredField(node)) { return; }

    const identifier = ClassMemberCheck.unwrapParameterIdentifier(Reflect.get(node, 'parameter'));
    if (identifier === undefined) { return; }
    if (Reflect.get(identifier, 'type') !== 'Identifier') { return; }

    const name: unknown = Reflect.get(identifier, 'name');
    if (typeof name !== 'string' || !name.startsWith('_')) { return; }

    ViolationReporter.reportUnderscoreName(context, identifier as unknown as Rule.Node, name);
  }
}

export const hashPrivateFields: Rule.RuleModule = {
  'create': (context) => {
    const onMethodDefinition = (node: unknown): void => { ClassMemberCheck.onClassMember(context, node as Record<string, unknown>); };
    const onPropertyDefinition = (node: unknown): void => { ClassMemberCheck.onClassMember(context, node as Record<string, unknown>); };
    const onTSParameterProperty = (node: unknown): void => { ClassMemberCheck.onParameterProperty(context, node); };

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
