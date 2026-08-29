import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

class UnderscoreName {
  public static get(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) { return undefined; }

    const key: unknown = Reflect.get(node, 'key');
    if (!Predicates.isRecord(key)) { return undefined; }
    const keyType = Reflect.get(key, 'type');
    const computed = Reflect.get(node, 'computed') === true;

    // Bare, non-computed identifier key: `_bar = 1`.
    if (!computed && keyType === 'Identifier') {
      const name: unknown = Reflect.get(key, 'name');
      const result = typeof name === 'string' && name.startsWith('_') ? name : undefined;
      return result;
    }

    // String-literal key, either bracketed (`['_secret'] = 1`, computed) or bare
    // (`'_secret' = 1`, non-computed) — both name the member the same way an
    // identifier key would, and both must be checked the same way.
    if (keyType === 'Literal') {
      const value: unknown = Reflect.get(key, 'value');
      const result = typeof value === 'string' && value.startsWith('_') ? value : undefined;
      return result;
    }

    return undefined;
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
    if (!Predicates.isRecord(parameter)) { return undefined; }
    if (Reflect.get(parameter, 'type') !== 'AssignmentPattern') { return parameter; }

    const left: unknown = Reflect.get(parameter, 'left');
    const result = Predicates.isRecord(left) ? left : undefined;
    return result;
  }

  public static isDeclaredField(node: Record<string, unknown>): boolean {
    const result = Reflect.get(node, 'accessibility') !== undefined || Reflect.get(node, 'readonly') === true;
    return result;
  }

  public static onParameterProperty(context: Rule.RuleContext, node: unknown): void {
    if (!Predicates.isRecord(node)) { return; }
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
