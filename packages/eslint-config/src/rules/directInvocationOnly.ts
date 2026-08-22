import type { Rule, Scope } from 'eslint';
import type ts from 'typescript';

import { ObjectGuard } from './shared/ObjectGuard.js';

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap'?: Map<unknown, ts.Node>;
  readonly 'program'?: ts.Program;
}

class TypeGuards {
  static hasTypeServices(value: unknown): value is Required<ParserServicesInterface> {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!('program' in value) || !ObjectGuard.isObject(value.program)) { return false; }
    if (typeof value.program.getTypeChecker !== 'function') { return false; }
    if (!('esTreeNodeToTSNodeMap' in value) || !ObjectGuard.isObject(value.esTreeNodeToTSNodeMap)) { return false; }

    // Duck-type the Map: avoid cross-realm instanceof failures when the Map is from a different module instance.
    const result = typeof value.esTreeNodeToTSNodeMap.get === 'function';
    return result;
  }
}

class BannedProperty {
  static isMatch(node: unknown): boolean {
    if (node === null || node === undefined) { return false; }
    if (typeof node !== 'object') { return false; }

    if (Reflect.get(node, 'type') === 'Identifier') {
      const name: unknown = Reflect.get(node, 'name');
      const result = name === 'bind' || name === 'call' || name === 'apply';
      return result;
    }
    if (Reflect.get(node, 'type') === 'Literal') {
      const value: unknown = Reflect.get(node, 'value');
      const result = value === 'bind' || value === 'call' || value === 'apply';
      return result;
    }

    return false;
  }

  // A bare `MemberExpression` matching a banned property — the shape of both
  // a direct `fn.bind(...)` callee and an alias-forming `const rebind = fn.bind;`
  // declarator init.
  static isBannedMemberExpression(node: unknown): node is { 'object': unknown; 'property': unknown } {
    if (node === null || node === undefined || typeof node !== 'object') { return false; }
    if (Reflect.get(node, 'type') !== 'MemberExpression') { return false; }

    const result = BannedProperty.isMatch(Reflect.get(node, 'property'));
    return result;
  }
}

interface AliasBindingInterface {
  readonly 'object': unknown;
}

export const directInvocationOnly: Rule.RuleModule = {
  'create': (context) => {
    // Declarators of the form `const rebind = fn.bind;` — a bare property read that aliases a
    // banned method without calling it. Tracked by the declarator node (the `Variable`'s
    // `defs[i].node` for a variable definition), so a later call of the alias — however far away,
    // resolved through the scope manager rather than by name — is treated as if it were the
    // original `fn.bind(...)` call.
    const aliasBindings = new WeakMap<object, AliasBindingInterface>();

    // Proves the receiver is a callable Function via the type checker. Without that proof we do
    // not report: "if we cannot prove it, we do not enforce it."
    const isProvablyCallable = (objectNode: unknown): boolean => {
      const servicesUnknown: unknown = context.sourceCode.parserServices;
      if (!TypeGuards.hasTypeServices(servicesUnknown)) { return false; }

      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(objectNode);
      if (tsNode === undefined) { return false; }

      const checker = servicesUnknown.program.getTypeChecker();
      const type = checker.getTypeAtLocation(tsNode);

      // A callable Function has at least one call signature.
      // Class instances, plain objects, and `any` have zero call signatures — not provably callable.
      const result = type.getCallSignatures().length > 0;
      return result;
    };

    const reportIfBannedMember = (reportNode: Rule.Node, memberExpression: unknown): void => {
      if (!BannedProperty.isBannedMemberExpression(memberExpression)) { return; }
      if (!isProvablyCallable(memberExpression.object)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': reportNode });
    };

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      const rawNode: unknown = node;
      if (typeof rawNode !== 'object' || rawNode === null) { return; }

      const init: unknown = Reflect.get(rawNode, 'init');
      if (!BannedProperty.isBannedMemberExpression(init)) { return; }

      aliasBindings.set(node, { 'object': init.object });
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const { callee } = node;

      if (callee.type === 'MemberExpression') {
        reportIfBannedMember(node, callee);
        return;
      }

      // `(0, fn.bind)(null)` — a comma-sequence-expression callee. Per JS semantics, only the
      // LAST expression in the sequence is actually invoked; the leading `0` is throwaway noise
      // used to strip the implicit `this` binding a direct member-expression call would carry.
      if (callee.type === 'SequenceExpression') {
        const { expressions } = callee;
        const lastExpression = expressions.at(-1);

        reportIfBannedMember(node, lastExpression);
        return;
      }

      // `rebind(null)` where `rebind` was earlier bound to `fn.bind` via a bare property read —
      // resolve the identifier through the scope manager (never by name alone, to respect
      // shadowing) and treat it as the original member-expression call if it resolves to a
      // tracked alias binding.
      if (callee.type === 'Identifier') {
        let scope: Scope.Scope | null = context.sourceCode.getScope(node);

        while (scope !== null) {
          let variable: Scope.Variable | undefined;
          const scopeVariables = scope.variables;
          const scopeVariablesLength = scopeVariables.length;
          for (let index = 0; index < scopeVariablesLength; index += 1) {
            const candidate = scopeVariables.at(index);
            if (candidate?.name === callee.name) { variable = candidate; break; }
          }

          if (variable !== undefined) {
            const defs = variable.defs;
            const defsLength = defs.length;
            for (let index = 0; index < defsLength; index += 1) {
              const def = defs.at(index);
              const binding = def === undefined ? undefined : aliasBindings.get(def.node);

              if (binding !== undefined && isProvablyCallable(binding.object)) {
                context.report({ 'messageId': 'forbidden', 'node': node });
                return;
              }
            }
            return;
          }

          scope = scope.upper;
        }
      }
    };

    return { 'CallExpression': onCallExpression, 'VariableDeclarator': onVariableDeclarator };
  },
  'meta': {
    'docs': {
      'description': 'Disallow Function.prototype.bind/call/apply usage.',
      'recommended': false
    },
    'messages': { 'forbidden': 'bind/call/apply are forbidden. Refactor to avoid explicit binding.' },
    'schema': [],
    'type': 'problem'
  }
};
