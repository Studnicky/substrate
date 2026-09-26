import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule } from 'eslint';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from './shared/astHelpers.js';
import { DeclareThenReturnShape } from './shared/DeclareThenReturnShape.js';
import { ParameterNames } from './shared/ParameterNames.js';
import { TrivialExpression } from './shared/TrivialExpression.js';

// Detection reduces a body to its forwarded expression (TrivialExpression.isTrivial); see
// inline-trivial-logic.md for exemption evidence, semantics, and the explicit-return-binding pairing.

namespace InlineTrivialLogicOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'allowLiterals': {
        'default': true,
        'description': 'Allow functions that return a constant literal or template literal (string, number, boolean). Default true — such a function is the value, not a forward to one. Set false for the stricter posture of also flagging literal returns.',
        'type': 'boolean'
      },
      'allowMemberExpressions': {
        'default': false,
        'description': 'Allow functions that return a non-this member expression (e.g. obj.prop).',
        'type': 'boolean'
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'allowLiterals': SchemaNode.defineBoolean({
    'default': true,
    'description': 'Allow functions that return a constant literal or template literal (string, number, boolean). Default true — such a function is the value, not a forward to one. Set false for the stricter posture of also flagging literal returns.',
    'type': 'boolean'
  } as const), 'allowMemberExpressions': SchemaNode.defineBoolean({
    'default': false,
    'description': 'Allow functions that return a non-this member expression (e.g. obj.prop).',
    'type': 'boolean'
  } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}

// A callback argument is a deferred computation, not a shim — no call site exists to inline
// into. See inline-trivial-logic.md Exemptions for the hook-thunk evidence and rule pairing.
class CallbackArgumentGuard {
  /** Reaches through literal (object/array) containers only — see inline-trivial-logic.md Exemptions. */
  public static isCallArgument(node: Rule.Node): boolean {
    const current = CallbackArgumentGuard.#walkPastContainers(node);
    const parent = current.parent;

    if (parent === null || !Predicates.isRecord(parent)) {
      return false;
    }
    if (parent.type !== 'CallExpression' && parent.type !== 'NewExpression') {
      return false;
    }

    const argumentList: readonly unknown[] = Array.isArray(parent.arguments) ? parent.arguments : [];
    const result = argumentList.includes(current);

    return result;
  }

  static #walkPastContainers(node: Rule.Node): Rule.Node {
    let current: Rule.Node = node;
    let walker = current.parent;

    while (walker !== null && Predicates.isRecord(walker)
      && (walker.type === 'Property' || walker.type === 'ObjectExpression' || walker.type === 'ArrayExpression')) {
      current = walker;
      walker = current.parent;
    }

    return current;
  }
}

class TypePredicateGuard {
  /** Type-predicate exemption — see inline-trivial-logic.md Exemptions. */
  public static hasTypePredicateReturn(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    const returnType = AstHelpers.getNodeProperty(node, 'returnType');

    if (!Predicates.isRecord(returnType)) {
      return false;
    }

    const typeAnnotation = AstHelpers.getNodeProperty(returnType, 'typeAnnotation');

    if (!Predicates.isRecord(typeAnnotation)) {
      return false;
    }

    const result = typeAnnotation.type === 'TSTypePredicate';

    return result;
  }
}

// A class member mandated by a type contract has no call site to inline into — see
// inline-trivial-logic.md Exemptions.
class TypeContractGuard {
  /** True when `node`'s declaration is mandated by heritage or a `protected`/`override` modifier, resolved through the checker rather than name-matching. */
  public static isTypeContractMember(node: Rule.Node, context: Rule.RuleContext): boolean {
    const container = TypeContractGuard.#findMethodContainer(node);

    if (container === undefined) {
      return false;
    }

    const computed = AstHelpers.getNodeProperty(container, 'computed');

    if (computed !== false) {
      return false;
    }

    const methodName = TypeContractGuard.#getStaticKeyName(AstHelpers.getNodeProperty(container, 'key'));

    if (methodName === undefined) {
      return false;
    }
    if (TypeContractGuard.#hasLocalContractModifier(container)) {
      return true;
    }

    const classNode = TypeContractGuard.#findContainingClass(container);

    if (classNode === undefined) {
      return false;
    }

    const result = TypeContractGuard.#heritageDeclaresMember(classNode, methodName, context);

    return result;
  }

  /** Walks up to the `MethodDefinition`/`PropertyDefinition` that owns `node` as its value. */
  static #findMethodContainer(node: Rule.Node): Rule.Node | undefined {
    const parent = node.parent;

    if (parent === null || !Predicates.isRecord(parent)) {
      return undefined;
    }
    if (parent.type !== 'MethodDefinition' && parent.type !== 'PropertyDefinition') {
      return undefined;
    }
    if (parent.value !== node) {
      return undefined;
    }

    return parent;
  }

  /** Reads a statically-known member name off a non-computed key; `undefined` otherwise. */
  static #getStaticKeyName(key: unknown): string | undefined {
    if (!Predicates.isRecord(key)) {
      return undefined;
    }
    if (key.type === 'Identifier' && typeof key.name === 'string') {
      return key.name;
    }
    if (key.type === 'Literal' && typeof key.value === 'string') {
      return key.value;
    }

    return undefined;
  }

  /** `protected` accessibility or an explicit `override` modifier -- a declared override seam. */
  static #hasLocalContractModifier(container: Rule.Node): boolean {
    const accessibility = AstHelpers.getNodeProperty(container, 'accessibility');

    if (accessibility === 'protected') {
      return true;
    }

    const overrideModifier = AstHelpers.getNodeProperty(container, 'override');
    const result = overrideModifier === true;

    return result;
  }

  static #findContainingClass(container: Rule.Node): Rule.Node | undefined {
    const classBody = container.parent;

    if (classBody === null) {
      return undefined;
    }

    const classNode = classBody.parent;

    if (classNode === null) {
      return undefined;
    }
    if (classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression') {
      return undefined;
    }

    return classNode;
  }

  /** Every heritage expression (`extends` target, each `implements` entry) on `classNode`. */
  static #collectHeritageExpressions(classNode: Rule.Node): readonly Rule.Node[] {
    const result: Rule.Node[] = [];
    const superClass = AstHelpers.getNodeProperty(classNode, 'superClass');

    if (AstHelpers.isNode(superClass)) {
      result.push(superClass);
    }

    const implementsClauses = AstHelpers.getNodeProperty(classNode, 'implements');

    if (Predicates.isArray(implementsClauses)) {
      const clauseCount = implementsClauses.length;

      for (let index = 0; index < clauseCount; index += 1) {
        const clause = implementsClauses.at(index);
        const expression = AstHelpers.getNodeProperty(clause, 'expression');

        if (AstHelpers.isNode(expression)) {
          result.push(expression);
        }
      }
    }

    return result;
  }

  /** Covers interface and abstract base-class members alike via `checker.getTypeAtLocation`; `false` without type-aware parser services (see inline-trivial-logic.md Exemptions). */
  static #heritageDeclaresMember(classNode: Rule.Node, methodName: string, context: Rule.RuleContext): boolean {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return false;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const heritageExpressions = TypeContractGuard.#collectHeritageExpressions(classNode);
    const heritageCount = heritageExpressions.length;

    for (let index = 0; index < heritageCount; index += 1) {
      const expression = heritageExpressions.at(index);

      if (expression === undefined) {
        continue;
      }

      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(expression);

      if (tsNode === undefined) {
        continue;
      }

      const type = checker.getTypeAtLocation(tsNode);
      const property = checker.getPropertyOfType(type, methodName);

      if (property !== undefined) {
        return true;
      }
    }

    return false;
  }
}

// Reduces a body to the expression it ultimately returns (one statement, or an exact
// declare-then-return pair) — see inline-trivial-logic.md "Detection is semantic".
class ForwardedReturnReduction {
  public static reduce(body: readonly unknown[]): unknown {
    const meaningful = ForwardedReturnReduction.#dropLeadingEmptyStatements(body);

    if (meaningful.length === 1) {
      const result = ForwardedReturnReduction.#fromBareReturn(meaningful.at(0));

      return result;
    }
    if (meaningful.length === 2) {
      // Accepts any declaration kind (`var`/`let`/`const`) — kind-agnostic by design; see `DeclareThenReturnShape`.
      const result = DeclareThenReturnShape.of(meaningful.at(0), meaningful.at(1))?.initializer;

      return result;
    }

    return undefined;
  }

  static #dropLeadingEmptyStatements(body: readonly unknown[]): readonly unknown[] {
    let start = 0;
    const bodyLength = body.length;

    while (start < bodyLength && AstHelpers.getNodeType(body.at(start)) === 'EmptyStatement') {
      start += 1;
    }

    const result = start === 0 ? body : body.slice(start);

    return result;
  }

  static #fromBareReturn(statement: unknown): unknown {
    if (AstHelpers.getNodeType(statement) !== 'ReturnStatement') {
      return undefined;
    }

    const result = Predicates.isRecord(statement) ? statement.argument : undefined;

    return result;
  }
}

export const inlineTrivialLogic: Rule.RuleModule = {
  'create': (context) => {
    const options = InlineTrivialLogicOptionsEntity.intake(context.options.at(0) ?? {});

    const reportIfTrivial = (node: Rule.Node, expression: unknown): void => {
      const type = AstHelpers.getNodeType(expression);

      if (type === undefined) {
        return;
      }
      if (type === 'ThisExpression') {
        return;
      }
      if (!TrivialExpression.isTrivial(expression, options, ParameterNames.of(node), context)) {
        return;
      }

      context.report({
        'messageId': 'trivial', 'node': node
      });
    };

    const reportBodyIfTrivial = (node: Rule.Node, body: readonly unknown[]): void => {
      const argument = ForwardedReturnReduction.reduce(body);

      if (argument === undefined) {
        return;
      }
      reportIfTrivial(node, argument);
    };

    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      if (CallbackArgumentGuard.isCallArgument(node)) {
        return;
      }
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      if (TypeContractGuard.isTypeContractMember(node, context)) {
        return;
      }
      if (node.body.type === 'BlockStatement') {
        reportBodyIfTrivial(node, node.body.body);

        return;
      }
      reportIfTrivial(node, node.body);
    };

    const onFunctionDeclaration: NonNullable<Rule.RuleListener['FunctionDeclaration']> = (node) => {
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      reportBodyIfTrivial(node, node.body.body);
    };

    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
      if (CallbackArgumentGuard.isCallArgument(node)) {
        return;
      }
      if (TypePredicateGuard.hasTypePredicateReturn(node)) {
        return;
      }
      if (TypeContractGuard.isTypeContractMember(node, context)) {
        return;
      }
      reportBodyIfTrivial(node, node.body.body);
    };

    return {
      'ArrowFunctionExpression': onArrowFunctionExpression,
      'FunctionDeclaration': onFunctionDeclaration,
      'FunctionExpression': onFunctionExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow trivial shim functions that only forward/delegate a value without adding logic.',
      'recommended': false
    },
    'messages': { 'trivial': 'Trivial shim functions are forbidden. Inline the logic at the call site.' },
    'schema': [InlineTrivialLogicOptionsEntity.Schema],
    'type': 'problem'
  }
};
