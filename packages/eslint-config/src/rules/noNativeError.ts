import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule, Scope } from 'eslint';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ABORT_CONTROLLER_TYPE_NAME, ABORT_METHOD_NAME, DEFAULT_BASE_CLASS_NAMES, NATIVE_ERROR_CONSTRUCTORS } from './constants/NoNativeErrorConstants.js';
import { AstHelpers } from './shared/astHelpers.js';

namespace NoNativeErrorOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'baseClassNames': {
        'default': DEFAULT_BASE_CLASS_NAMES,
        'description': 'Names of abstract class declarations permitted to extend a native error constructor: the roots every other error descends from.',
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'baseClassNames': SchemaNode.defineArray({
      'default': DEFAULT_BASE_CLASS_NAMES,
      'description': 'Names of abstract class declarations permitted to extend a native error constructor: the roots every other error descends from.',
      'type': 'array'
    } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}

class ErrorRoot {
  /** True for an `abstract` class declaration whose name is one of `baseClassNames`. */
  public static isDeclaredRoot(node: Rule.Node, baseClassNames: ReadonlySet<string>): boolean {
    const name = AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(node, 'id'));
    const isAbstractDeclaration = node.type === 'ClassDeclaration' && AstHelpers.getNodeProperty(node, 'abstract') === true;
    const result = isAbstractDeclaration && typeof name === 'string' && baseClassNames.has(name);

    return result;
  }
}

// EVERY ERROR A LIBRARY EMITS IS A NAMED BaseError SUBCLASS. A native `Error` carries no code
// and no stable name, so a consumer cannot branch on it; a bare `controller.abort()` rejects
// with a generic DOMException that names nothing about why the work stopped.

class GlobalBinding {
  /** True when `name` resolves to no declaration in scope — the ambient global, not a local class, import, or variable. */
  public static isAmbient(scope: Scope.Scope, name: string): boolean {
    let current: Scope.Scope | null = scope;

    while (current !== null) {
      const variable = current.set.get(name);

      if (variable !== undefined) {
        const isAmbient = variable.defs.length === 0;

        return isAmbient;
      }

      current = current.upper;
    }

    return true;
  }
}

class NativeConstructorName {
  /** The native constructor named by `callee`, or `undefined` when `callee` is anything else or is shadowed. */
  public static resolve(callee: unknown, scope: Scope.Scope): string | undefined {
    const name = AstHelpers.getNodeType(callee) === 'Identifier' ? AstHelpers.getIdentifierName(callee) : undefined;

    if (typeof name === 'string' && NATIVE_ERROR_CONSTRUCTORS.has(name) && GlobalBinding.isAmbient(scope, name)) {
      return name;
    }

    return undefined;
  }
}

class AbortReceiver {
  /** True when the checker types `receiver` as an `AbortController`; `false` without type-aware parser services. */
  public static isAbortController(receiver: unknown, context: Rule.RuleContext): boolean {
    const services: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(services)) {
      return false;
    }

    const tsNode = services.esTreeNodeToTSNodeMap.get(receiver);

    if (tsNode === undefined) {
      return false;
    }

    const symbolName = services.program.getTypeChecker().getTypeAtLocation(tsNode).getSymbol()?.getName();

    const result = symbolName === ABORT_CONTROLLER_TYPE_NAME;

    return result;
  }

  public static isBareAbortCall(node: Rule.Node): boolean {
    const callee = AstHelpers.getNodeProperty(node, 'callee');
    const argumentList = AstHelpers.getNodeProperty(node, 'arguments');

    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || !Array.isArray(argumentList) || argumentList.length > 0) {
      return false;
    }

    const property = AstHelpers.getNodeProperty(callee, 'property');
    const computed = AstHelpers.getNodeProperty(callee, 'computed');

    const result = computed === false && AstHelpers.getIdentifierName(property) === ABORT_METHOD_NAME;

    return result;
  }
}

export const noNativeError: Rule.RuleModule = {
  'create': (context) => {
    const options = NoNativeErrorOptionsEntity.intake(context.options.at(0) ?? {});
    const baseClassNames = new Set(options.baseClassNames);

    const reportConstruction = (node: Rule.Node): void => {
      const name = NativeConstructorName.resolve(AstHelpers.getNodeProperty(node, 'callee'), context.sourceCode.getScope(node));

      if (typeof name === 'string') {
        context.report({ 'data': { 'name': name }, 'messageId': 'nativeConstruction', 'node': node });
      }
    };

    const reportHeritage = (node: Rule.Node): void => {
      if (ErrorRoot.isDeclaredRoot(node, baseClassNames)) {
        return;
      }

      const superClass = AstHelpers.getNodeProperty(node, 'superClass');
      const name = NativeConstructorName.resolve(superClass, context.sourceCode.getScope(node));

      if (typeof name === 'string' && AstHelpers.isNode(superClass)) {
        context.report({ 'data': { 'name': name }, 'messageId': 'nativeHeritage', 'node': superClass });
      }
    };

    const reportCall = (node: Rule.Node): void => {
      reportConstruction(node);

      if (AbortReceiver.isBareAbortCall(node)) {
        const callee = AstHelpers.getNodeProperty(node, 'callee');

        if (AbortReceiver.isAbortController(AstHelpers.getNodeProperty(callee, 'object'), context)) {
          context.report({ 'messageId': 'abortWithoutReason', 'node': node });
        }
      }
    };

    return {
      'CallExpression': reportCall,
      'ClassDeclaration': reportHeritage,
      'ClassExpression': reportHeritage,
      'NewExpression': reportConstruction
    };
  },
  'meta': {
    'docs': {
      'description': 'Require every emitted error to be a named BaseError subclass, never a native error constructor or a reasonless abort.',
      'recommended': false
    },
    'messages': {
      'abortWithoutReason': 'Pass a named BaseError subclass instance as the abort reason; a bare `abort()` rejects with a generic DOMException that carries no code.',
      'nativeConstruction': 'Construct a named BaseError subclass instead of the native `{{name}}`; every error this package emits carries a code and name.',
      'nativeHeritage': 'Extend BaseError instead of the native `{{name}}`; every error class this package declares carries a code and name.'
    },
    'schema': [NoNativeErrorOptionsEntity.Schema],
    'type': 'problem'
  }
};
