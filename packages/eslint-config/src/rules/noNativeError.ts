import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule, Scope } from 'eslint';
import type ts from 'typescript';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { isBindingElement, isCallLikeExpression, isIdentifier, isInterfaceDeclaration, isObjectBindingPattern, isObjectLiteralExpression, isPropertySignature, TypeFlags } from 'typescript';

import {
  ABORT_CONTROLLER_TYPE_NAME,
  ABORT_METHOD_NAME,
  DEFAULT_BASE_CLASS_NAMES,
  DEFAULT_PASS_THROUGH_METHODS,
  EXEMPTABLE_MESSAGE_IDS,
  NATIVE_ERROR_CONSTRUCTORS,
  PROMISE_GLOBAL_NAME,
  PROMISE_REJECT_METHOD_NAME,
  PROMISE_RESOLVERS_INTERFACE_NAME,
  RESOLVER_STORE_VALUE_KEYS
} from './constants/NoNativeErrorConstants.js';
import { PassThroughMethodEntity } from './PassThroughMethodEntity.js';
import { PlatformCallEntity } from './PlatformCallEntity.js';
import { AstHelpers } from './shared/astHelpers.js';
import { PlatformCallDefaults } from './shared/PlatformCallDefaults.js';
import { PlatformCallDetector } from './shared/PlatformCallDetector.js';
import { PlatformCallGuard } from './shared/PlatformCallGuard.js';

namespace NoNativeErrorOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'baseClassNames': {
        'default': DEFAULT_BASE_CLASS_NAMES,
        'description': 'Names of abstract class declarations permitted to extend a native error constructor: the roots every other error descends from.',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'passThroughMethods': {
        'default': DEFAULT_PASS_THROUGH_METHODS,
        'description': 'Class and method pairs whose body may throw a value that is not a BaseError: the sanctioned channel for errors raised by caller-supplied code.',
        'items': PassThroughMethodEntity.Schema,
        'type': 'array'
      },
      'platformCalls': {
        'default': PlatformCallDefaults.build(),
        'description': 'Platform APIs, resolved through the checker to a declaration in the default lib or @types/node, whose use must sit inside a try block with a catch clause or a promise chain ending in a rejection handler. Replaces the default list.',
        'items': PlatformCallEntity.Schema,
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
    } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
    'passThroughMethods': SchemaNode.defineArray({
      'default': DEFAULT_PASS_THROUGH_METHODS,
      'description': 'Class and method pairs whose body may throw a value that is not a BaseError: the sanctioned channel for errors raised by caller-supplied code.',
      'type': 'array'
    } as const, PassThroughMethodEntity.Node, undefined),
    'platformCalls': SchemaNode.defineArray({
      'default': PlatformCallDefaults.build(),
      'description': 'Platform APIs, resolved through the checker to a declaration in the default lib or @types/node, whose use must sit inside a try block with a catch clause or a promise chain ending in a rejection handler. Replaces the default list.',
      'type': 'array'
    } as const, PlatformCallEntity.Node, undefined)
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
  /** The variable `name` resolves to from `scope`, or `undefined` when no scope declares it. */
  public static find(scope: Scope.Scope, name: string): Scope.Variable | undefined {
    let current: Scope.Scope | null = scope;

    while (current !== null) {
      const variable = current.set.get(name);

      if (variable !== undefined) {
        return variable;
      }

      current = current.upper;
    }

    return undefined;
  }

  /** True when `name` resolves to no declaration in scope — the ambient global, not a local class, import, or variable. */
  public static isAmbient(scope: Scope.Scope, name: string): boolean {
    const variable = GlobalBinding.find(scope, name);
    const result = variable === undefined || variable.defs.length === 0;

    return result;
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

/** Type-checker access through the parser services; every member is `undefined` without typed linting. */
class TypeAccess {
  /** The checker, or `undefined` without type-aware parser services. */
  public static checker(context: Rule.RuleContext): ts.TypeChecker | undefined {
    const services: unknown = context.sourceCode.parserServices;
    const result = AstHelpers.hasTypeServices(services) ? services.program.getTypeChecker() : undefined;

    return result;
  }

  /** The TypeScript node behind an ESTree node, or `undefined` without type-aware parser services. */
  public static tsNode(node: unknown, context: Rule.RuleContext): ts.Node | undefined {
    const services: unknown = context.sourceCode.parserServices;
    const result = AstHelpers.hasTypeServices(services) ? services.esTreeNodeToTSNodeMap.get(node) : undefined;

    return result;
  }

  /** The ESTree node behind a TypeScript node, or `undefined` without type-aware parser services or a mapping. */
  public static esTreeNode(node: ts.Node, context: Rule.RuleContext): Rule.Node | undefined {
    const services: unknown = context.sourceCode.parserServices;
    const map: unknown = AstHelpers.hasTypeServices(services) ? Reflect.get(services, 'tsNodeToESTreeNodeMap') : undefined;
    const mapped: unknown = map instanceof Map || map instanceof WeakMap ? map.get(node) : undefined;
    const result = AstHelpers.isNode(mapped) ? mapped : undefined;

    return result;
  }
}

class AbortReceiver {
  /** True when the checker types `receiver` as an `AbortController`; `false` without type-aware parser services. */
  public static isAbortController(receiver: unknown, context: Rule.RuleContext): boolean {
    const checker = TypeAccess.checker(context);
    const tsNode = TypeAccess.tsNode(receiver, context);

    if (checker === undefined || tsNode === undefined) {
      return false;
    }

    const symbolName = checker.getTypeAtLocation(tsNode).getSymbol()?.getName();

    const result = symbolName === ABORT_CONTROLLER_TYPE_NAME;

    return result;
  }

  /** True for a non-computed `<receiver>.abort(...)` call carrying exactly `argumentCount` arguments (or at least one when `argumentCount` is `undefined`). */
  public static isAbortCall(node: Rule.Node, argumentCount: number | undefined): boolean {
    const callee = AstHelpers.getNodeProperty(node, 'callee');
    const argumentList = AstHelpers.getNodeProperty(node, 'arguments');

    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || !Array.isArray(argumentList)) {
      return false;
    }

    const arityMatches = typeof argumentCount === 'number' ? argumentList.length === argumentCount : argumentList.length > 0;
    const property = AstHelpers.getNodeProperty(callee, 'property');
    const computed = AstHelpers.getNodeProperty(callee, 'computed');

    const result = arityMatches && computed === false && AstHelpers.getIdentifierName(property) === ABORT_METHOD_NAME;

    return result;
  }
}

class BaseErrorType {
  /** True when every value of `type` is an instance of a class descending from one of `baseClassNames`. `unknown`, `any`, and native error types are not. */
  public static accepts(type: ts.Type, checker: ts.TypeChecker, baseClassNames: ReadonlySet<string>): boolean {
    const accepts = (member: ts.Type): boolean => {
      const result = BaseErrorType.accepts(member, checker, baseClassNames);

      return result;
    };

    if ((type.flags & TypeFlags.Never) !== 0) {
      return true;
    }

    if ((type.flags & (TypeFlags.Any | TypeFlags.Unknown)) !== 0) {
      return false;
    }

    if (type.isUnion()) {
      const everyMember = type.types.every(accepts);

      return everyMember;
    }

    if (type.isIntersection()) {
      const someMember = type.types.some(accepts);

      return someMember;
    }

    if (type.isTypeParameter()) {
      const constraint = type.getConstraint();
      const result = constraint !== undefined && accepts(constraint);

      return result;
    }

    const result = BaseErrorType.descendsFrom(type, checker, baseClassNames);

    return result;
  }

  private static descendsFrom(type: ts.Type, checker: ts.TypeChecker, baseClassNames: ReadonlySet<string>): boolean {
    const symbolName = type.getSymbol()?.getName();

    if (typeof symbolName === 'string' && baseClassNames.has(symbolName)) {
      return true;
    }

    const declared = AstHelpers.isTypeReference(type) ? type.target : type;
    const result = declared.isClassOrInterface() && checker.getBaseTypes(declared).some((base) => {
      const descends = BaseErrorType.descendsFrom(base, checker, baseClassNames);

      return descends;
    });

    return result;
  }
}

class PassThroughSite {
  /** True when `node` sits lexically inside a method named by `passThroughMethods` (the nearest enclosing method decides). */
  public static contains(node: Rule.Node, passThroughMethods: readonly PassThroughMethodEntity.Type[]): boolean {
    let current: Rule.Node | null = AstHelpers.getParent(node);

    while (current !== null) {
      if (current.type === 'MethodDefinition') {
        const result = PassThroughSite.isListed(current, passThroughMethods);

        return result;
      }

      current = AstHelpers.getParent(current);
    }

    return false;
  }

  private static isListed(method: Rule.Node, passThroughMethods: readonly PassThroughMethodEntity.Type[]): boolean {
    const methodName = AstHelpers.getNodeProperty(method, 'computed') === false ? AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(method, 'key')) : undefined;
    const classBody = AstHelpers.getParent(method);
    const classNode = classBody === null ? null : AstHelpers.getParent(classBody);
    const className = classNode === null ? undefined : AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(classNode, 'id'));

    const result = passThroughMethods.some((entry) => {
      const matches = entry.class === className && entry.method === methodName;

      return matches;
    });

    return result;
  }
}

class CatchClauseSite {
  /** True when `node` is lexically inside a `catch` clause. */
  public static contains(node: Rule.Node): boolean {
    let current: Rule.Node | null = AstHelpers.getParent(node);

    while (current !== null) {
      if (current.type === 'CatchClause') {
        return true;
      }

      current = AstHelpers.getParent(current);
    }

    return false;
  }
}

class PromiseExecutor {
  /** The variable bound to the second parameter (`reject`) of an inline `new Promise((resolve, reject) => …)` executor, or `undefined`. */
  public static rejectVariable(node: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    const executor = PromiseExecutor.inlineExecutor(node, context);
    const parameterList = AstHelpers.getNodeProperty(executor, 'params');
    const rejectParameter: unknown = Array.isArray(parameterList) ? parameterList.at(1) : undefined;
    const rejectName = AstHelpers.getIdentifierName(rejectParameter);
    const declared = typeof rejectName === 'string' && AstHelpers.isNode(executor) ? context.sourceCode.getDeclaredVariables(executor) : [];
    const result = declared.find((variable) => {
      const isReject = variable.name === rejectName;

      return isReject;
    });

    return result;
  }

  /** True for `Promise.reject(...)` on the ambient `Promise`. */
  public static isStaticReject(node: Rule.Node, context: Rule.RuleContext): boolean {
    const callee = AstHelpers.getNodeProperty(node, 'callee');
    const receiver = AstHelpers.getNodeProperty(callee, 'object');
    const result = AstHelpers.getNodeType(callee) === 'MemberExpression'
      && AstHelpers.getIdentifierName(receiver) === PROMISE_GLOBAL_NAME
      && AstHelpers.getNodeProperty(callee, 'computed') === false
      && AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(callee, 'property')) === PROMISE_REJECT_METHOD_NAME
      && GlobalBinding.isAmbient(context.sourceCode.getScope(node), PROMISE_GLOBAL_NAME);

    return result;
  }

  private static inlineExecutor(node: Rule.Node, context: Rule.RuleContext): unknown {
    const callee = AstHelpers.getNodeProperty(node, 'callee');
    const isPromise = AstHelpers.getIdentifierName(callee) === PROMISE_GLOBAL_NAME && GlobalBinding.isAmbient(context.sourceCode.getScope(node), PROMISE_GLOBAL_NAME);
    const argumentList = AstHelpers.getNodeProperty(node, 'arguments');
    const executor: unknown = isPromise && Array.isArray(argumentList) ? argumentList.at(0) : undefined;
    const executorType = AstHelpers.getNodeType(executor);
    const result = executorType === 'ArrowFunctionExpression' || executorType === 'FunctionExpression' ? executor : undefined;

    return result;
  }
}

class ForwardedCallback {
  /** The parameter variable receiving argument `argumentIndex` of `call` when the callee is declared in the linted file. */
  public static localParameter(call: Rule.Node, argumentIndex: number, context: Rule.RuleContext): Scope.Variable | undefined {
    const functionNode = ForwardedCallback.localFunction(call, context);
    const parameterList = AstHelpers.getNodeProperty(functionNode, 'params');
    const parameter: unknown = Array.isArray(parameterList) ? parameterList.at(argumentIndex) : undefined;
    const parameterName = AstHelpers.getIdentifierName(ForwardedCallback.unwrapParameter(parameter));
    const declared = typeof parameterName === 'string' && AstHelpers.isNode(functionNode) ? context.sourceCode.getDeclaredVariables(functionNode) : [];
    const result = declared.find((variable) => {
      const isParameter = variable.name === parameterName;

      return isParameter;
    });

    return result;
  }

  /** The type the callee feeds to a callback passed at `argumentIndex`, when the callee is declared in the default library or an external package (`.catch(reject)` hands `reject` an `any`). */
  public static suppliedReasonType(call: Rule.Node, argumentIndex: number, context: Rule.RuleContext): ts.Type | undefined {
    const checker = TypeAccess.checker(context);
    const tsCall = TypeAccess.tsNode(call, context);
    const declaration = ForwardedCallback.declarationOf(call, context);

    if (checker === undefined || tsCall === undefined || declaration === undefined || !ForwardedCallback.isExternal(declaration, context)) {
      return undefined;
    }

    const signature = isCallLikeExpression(tsCall) ? checker.getResolvedSignature(tsCall) : undefined;
    const parameterSymbol = signature?.getParameters().at(argumentIndex);
    const result = parameterSymbol === undefined ? undefined : ForwardedCallback.callbackReasonType(checker, tsCall, parameterSymbol);

    return result;
  }

  private static callbackReasonType(checker: ts.TypeChecker, location: ts.Node, callbackParameter: ts.Symbol): ts.Type | undefined {
    const callbackType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(callbackParameter, location));
    const reasonSymbol = callbackType.getCallSignatures().at(0)?.getParameters().at(0);
    const result = reasonSymbol === undefined ? undefined : checker.getTypeOfSymbolAtLocation(reasonSymbol, location);

    return result;
  }

  private static localFunction(call: Rule.Node, context: Rule.RuleContext): unknown {
    const declaration = ForwardedCallback.declarationOf(call, context);
    const tsCall = TypeAccess.tsNode(call, context);
    const isLocal = tsCall !== undefined && declaration?.getSourceFile() === tsCall.getSourceFile();
    const mapped = isLocal && declaration !== undefined ? TypeAccess.esTreeNode(declaration, context) : undefined;
    const result: unknown = Array.isArray(AstHelpers.getNodeProperty(mapped, 'params')) ? mapped : AstHelpers.getNodeProperty(mapped, 'value');

    return result;
  }

  private static isExternal(declaration: ts.Declaration, context: Rule.RuleContext): boolean {
    const services: unknown = context.sourceCode.parserServices;
    const sourceFile = declaration.getSourceFile();
    const result = AstHelpers.hasTypeServices(services) && (services.program.isSourceFileDefaultLibrary(sourceFile) || services.program.isSourceFileFromExternalLibrary(sourceFile));

    return result;
  }

  private static declarationOf(call: Rule.Node, context: Rule.RuleContext): ts.Declaration | undefined {
    const checker = TypeAccess.checker(context);
    const tsCall = TypeAccess.tsNode(call, context);
    const result = checker !== undefined && tsCall !== undefined && isCallLikeExpression(tsCall) ? checker.getResolvedSignature(tsCall)?.declaration : undefined;

    return result;
  }

  private static unwrapParameter(parameter: unknown): unknown {
    const type = AstHelpers.getNodeType(parameter);
    const wrapped = type === 'AssignmentPattern' ? AstHelpers.getNodeProperty(parameter, 'left') : AstHelpers.getNodeProperty(parameter, 'parameter');
    const result = type === 'AssignmentPattern' || type === 'TSParameterProperty' ? wrapped : parameter;

    return result;
  }
}

class ResolverReject {
  /** True when `symbol` is the `reject` member of the lib `PromiseWithResolvers` interface (any instantiation). */
  public static isMember(symbol: ts.Symbol | undefined): boolean {
    const result = symbol?.declarations?.some((declaration) => {
      const isReject = isPropertySignature(declaration)
        && isIdentifier(declaration.name)
        && declaration.name.text === PROMISE_REJECT_METHOD_NAME
        && isInterfaceDeclaration(declaration.parent)
        && declaration.parent.name.text === PROMISE_RESOLVERS_INTERFACE_NAME;

      return isReject;
    }) ?? false;

    return result;
  }

  /** True when `symbol` is a variable destructured from a `PromiseWithResolvers` as its `reject` member. */
  public static isDestructured(symbol: ts.Symbol | undefined, checker: ts.TypeChecker): boolean {
    const result = symbol?.declarations?.some((declaration) => {
      const memberName = isBindingElement(declaration) ? declaration.propertyName ?? declaration.name : undefined;
      const isReject = isBindingElement(declaration)
        && isObjectBindingPattern(declaration.parent)
        && memberName !== undefined
        && isIdentifier(memberName)
        && ResolverReject.isMember(checker.getTypeAtLocation(declaration.parent).getProperty(memberName.text));

      return isReject;
    }) ?? false;

    return result;
  }
}

interface StoredLinkInterface {
  readonly 'from': ts.Node | ts.Symbol;
  readonly 'to': ts.Node | ts.Symbol;
}

interface MemberCallInterface {
  readonly 'call': Rule.Node;
  readonly 'symbol': ts.Node | ts.Symbol;
}

interface RejectionCheckInterface {
  /** Reports `type` at `anchor` when it is not a BaseError. */
  readonly 'checkType': (type: ts.Type | undefined, anchor: Rule.Node) => void;
  /** Reports the type of `value` at `anchor` when it is not a BaseError. */
  readonly 'checkValue': (value: unknown, anchor: Rule.Node) => void;
  /** True when `node` sits inside a pass-through method, where every checked emission form is exempt. */
  readonly 'isExempt': (node: Rule.Node) => boolean;
}

/**
 * Follows the `reject` function of a `new Promise` executor through aliases, property and field
 * stores, and callee parameters, and checks the reason of every call made through it.
 */
class RejectionTracker {
  readonly #check: RejectionCheckInterface;
  readonly #context: Rule.RuleContext;
  readonly #followers: ReadonlyMap<string, (parent: Rule.Node, identifier: Rule.Node) => void>;
  readonly #links: StoredLinkInterface[] = [];
  readonly #memberCalls: MemberCallInterface[] = [];
  readonly #storedSymbols = new Set<ts.Node | ts.Symbol>();
  readonly #tracked = new Set<Scope.Variable>();

  public constructor(context: Rule.RuleContext, check: RejectionCheckInterface) {
    this.#context = context;
    this.#check = check;
    this.#followers = new Map([
      ['AssignmentExpression', (parent, identifier): void => { this.#followAssignment(parent, identifier); }],
      ['CallExpression', (parent, identifier): void => { this.#followCall(parent, identifier); }],
      ['NewExpression', (parent, identifier): void => { this.#followPassed(parent, identifier); }],
      ['Property', (parent, identifier): void => { this.#followProperty(parent, identifier); }],
      ['VariableDeclarator', (parent, identifier): void => { this.#followDeclarator(parent, identifier); }]
    ]);
  }

  /** The identity of a member across generic instantiations: its declaration, since each instantiation gets its own symbol. */
  public static keyOf(symbol: ts.Symbol): ts.Node | ts.Symbol {
    const result = symbol.valueDeclaration ?? symbol.declarations?.at(0) ?? symbol;

    return result;
  }

  /** Checks the reason of `call` (`reject(reason)` or `Promise.reject(reason)`): a missing reason rejects with `undefined`. */
  public checkReason(call: Rule.Node): void {
    const argumentList = AstHelpers.getNodeProperty(call, 'arguments');
    const first: unknown = Array.isArray(argumentList) ? argumentList.at(0) : undefined;

    if (AstHelpers.getNodeType(first) === 'SpreadElement') {
      return;
    }

    if (AstHelpers.isNode(first)) {
      this.#check.checkValue(first, first);
    } else if (TypeAccess.checker(this.#context) !== undefined && !this.#check.isExempt(call)) {
      this.#context.report({ 'data': { 'type': 'undefined' }, 'messageId': 'nonBaseReject', 'node': call });
    }
  }

  /** Starts following the `reject` parameter of a `new Promise` executor. */
  public trackExecutor(node: Rule.Node): void {
    const variable = PromiseExecutor.rejectVariable(node, this.#context);

    if (variable !== undefined) {
      this.#track(variable);
    }
  }

  /** True when `node` (a `x.reject` member or a destructured `reject` identifier) resolves through the checker to the `reject` of a `PromiseWithResolvers`. */
  public isResolverReject(node: unknown): boolean {
    const checker = TypeAccess.checker(this.#context);
    const nodeType = AstHelpers.getNodeType(node);
    const symbol = nodeType === 'MemberExpression' ? this.#symbolOf(AstHelpers.getNodeProperty(node, 'property')) : this.#symbolOf(node);
    const result = checker !== undefined && (nodeType === 'MemberExpression' || nodeType === 'Identifier') && (ResolverReject.isMember(symbol) || ResolverReject.isDestructured(symbol, checker));

    return result;
  }

  /** Checks the reason of a call made through a `PromiseWithResolvers` `reject`, and follows a `reject` handed to a callee as an argument. */
  public checkResolverCall(call: Rule.Node): void {
    if (this.isResolverReject(AstHelpers.getNodeProperty(call, 'callee'))) {
      this.checkReason(call);
    }

    const argumentList = AstHelpers.getNodeProperty(call, 'arguments');

    const argumentNodes: unknown[] = Array.isArray(argumentList) ? argumentList : [];
    const argumentCount = argumentNodes.length;

    for (let index = 0; index < argumentCount; index += 1) {
      const argument = argumentNodes[index];

      if (AstHelpers.isNode(argument) && this.isResolverReject(argument)) {
        this.#followPassed(call, argument);
      }
    }
  }

  /** Follows a `PromiseWithResolvers` `reject` that is stored: declared into a variable, assigned, or set as an object-literal property. */
  public followResolverStore(node: Rule.Node): void {
    const value = AstHelpers.getNodeProperty(node, RESOLVER_STORE_VALUE_KEYS.get(node.type) ?? node.type);
    const follower = RESOLVER_STORE_VALUE_KEYS.has(node.type) ? this.#followers.get(node.type) : undefined;

    if (follower !== undefined && AstHelpers.isNode(value) && this.isResolverReject(value)) {
      follower(node, value);
    } else if (AstHelpers.getNodeType(value) === 'MemberExpression') {
      this.#linkStoredMember(node, value);
    }
  }

  /** Remembers a `<receiver>.<property>(...)` call so a stored `reject` called through that property is checked at `Program:exit`. */
  public recordMemberCall(call: Rule.Node): void {
    const callee = AstHelpers.getNodeProperty(call, 'callee');
    const symbol = this.#symbolOf(AstHelpers.getNodeProperty(callee, 'property'));

    if (AstHelpers.getNodeType(callee) === 'MemberExpression' && symbol !== undefined) {
      this.#memberCalls.push({ 'call': call, 'symbol': RejectionTracker.keyOf(symbol) });
    }
  }

  /** Checks every remembered member call made through a property a `reject` was stored under, including properties it was copied to from another stored property. */
  public checkStoredCalls(): void {
    let grown = true;

    while (grown) {
      grown = false;
      this.#links.forEach((link) => {
        if (this.#storedSymbols.has(link.from) && !this.#storedSymbols.has(link.to)) {
          this.#storedSymbols.add(link.to);
          grown = true;
        }
      });
    }

    this.#memberCalls.forEach((entry) => {
      if (this.#storedSymbols.has(entry.symbol)) {
        this.checkReason(entry.call);
      }
    });
  }

  #track(variable: Scope.Variable): void {
    if (this.#tracked.has(variable)) {
      return;
    }

    this.#tracked.add(variable);
    variable.references.forEach((reference) => {
      const identifier: unknown = reference.identifier;

      if (AstHelpers.isNode(identifier)) {
        this.#follow(identifier);
      }
    });
  }

  #follow(identifier: Rule.Node): void {
    const parent = AstHelpers.getParent(identifier);
    const follower = parent === null ? undefined : this.#followers.get(parent.type);

    if (parent !== null && follower !== undefined) {
      follower(parent, identifier);
    }
  }

  #followCall(call: Rule.Node, identifier: Rule.Node): void {
    if (AstHelpers.getNodeProperty(call, 'callee') === identifier) {
      this.checkReason(call);
    } else {
      this.#followPassed(call, identifier);
    }
  }

  #followPassed(call: Rule.Node, identifier: Rule.Node): void {
    const argumentList = AstHelpers.getNodeProperty(call, 'arguments');
    const index = Array.isArray(argumentList) ? argumentList.indexOf(identifier) : -1;
    const parameter = ForwardedCallback.localParameter(call, index, this.#context);

    if (parameter === undefined) {
      this.#check.checkType(ForwardedCallback.suppliedReasonType(call, index, this.#context), identifier);
    } else {
      this.#track(parameter);
    }
  }

  #followDeclarator(declarator: Rule.Node, identifier: Rule.Node): void {
    if (AstHelpers.getNodeProperty(declarator, 'init') === identifier) {
      this.#context.sourceCode.getDeclaredVariables(declarator).forEach((variable) => {
        this.#track(variable);
      });
    }
  }

  #followAssignment(assignment: Rule.Node, identifier: Rule.Node): void {
    const left = AstHelpers.getNodeProperty(assignment, 'left');

    if (AstHelpers.getNodeProperty(assignment, 'right') !== identifier) {
      return;
    }

    if (AstHelpers.getNodeType(left) === 'MemberExpression') {
      this.#storeSymbol(this.#symbolOf(AstHelpers.getNodeProperty(left, 'property')));
    } else {
      this.#trackNamed(left);
    }
  }

  #followProperty(property: Rule.Node, identifier: Rule.Node): void {
    if (AstHelpers.getNodeProperty(property, 'value') === identifier) {
      this.#storeSymbol(this.#propertySymbol(property));
    }
  }

  #trackNamed(identifier: unknown): void {
    const name = AstHelpers.getIdentifierName(identifier);
    const scope = AstHelpers.isNode(identifier) ? this.#context.sourceCode.getScope(identifier) : undefined;
    const variable = typeof name === 'string' && scope !== undefined ? GlobalBinding.find(scope, name) : undefined;

    if (variable !== undefined) {
      this.#track(variable);
    }
  }

  /** Records that the member read on the value side is copied into the property the object literal or assignment target declares. */
  #linkStoredMember(node: Rule.Node, value: unknown): void {
    const from = this.#symbolOf(AstHelpers.getNodeProperty(value, 'property'));
    const left = AstHelpers.getNodeProperty(node, 'left');
    const to = node.type === 'Property' ? this.#propertySymbol(node) : this.#symbolOf(AstHelpers.getNodeProperty(left, 'property'));

    if (from !== undefined && to !== undefined) {
      this.#links.push({ 'from': RejectionTracker.keyOf(from), 'to': RejectionTracker.keyOf(to) });
    }
  }

  #storeSymbol(symbol: ts.Symbol | undefined): void {
    if (symbol !== undefined) {
      this.#storedSymbols.add(RejectionTracker.keyOf(symbol));
    }
  }

  #symbolOf(node: unknown): ts.Symbol | undefined {
    const checker = TypeAccess.checker(this.#context);
    const tsNode = TypeAccess.tsNode(node, this.#context);
    const result = checker !== undefined && tsNode !== undefined ? checker.getSymbolAtLocation(tsNode) : undefined;

    return result;
  }

  /** The property symbol an object-literal member declares in its contextual type, so a call through the interface member matches the store. */
  #propertySymbol(property: Rule.Node): ts.Symbol | undefined {
    const objectNode = AstHelpers.getParent(property);
    const tsObject = objectNode === null ? undefined : TypeAccess.tsNode(objectNode, this.#context);
    const checker = TypeAccess.checker(this.#context);
    const key = AstHelpers.getNodeProperty(property, 'key');
    const literalKey = AstHelpers.getNodeProperty(key, 'value');
    const keyName = AstHelpers.getIdentifierName(key) ?? (typeof literalKey === 'string' ? literalKey : undefined);
    const contextual = checker !== undefined && tsObject !== undefined && isObjectLiteralExpression(tsObject) ? checker.getContextualType(tsObject) : undefined;
    const result = (typeof keyName === 'string' ? contextual?.getProperty(keyName) : undefined) ?? this.#symbolOf(AstHelpers.getNodeProperty(property, 'key'));

    return result;
  }
}

// EVERY ERROR A LIBRARY EMITS IS A NAMED BaseError SUBCLASS. A native `Error` carries no code
// and no stable name, so a consumer cannot branch on it; a bare `controller.abort()` rejects
// with a generic DOMException that names nothing about why the work stopped. A thrown,
// rejected, or abort-reason value is checked through the type checker: it must be assignable to
// a class descending from a `baseClassNames` root, so a caught `unknown` never escapes unwrapped.

/** A native construction is already reported at the `new`, so a value that IS that construction is not reported a second time. */
class ReportedConstruction {
  public static is(value: unknown, context: Rule.RuleContext): boolean {
    const valueType = AstHelpers.getNodeType(value);
    const isConstruction = valueType === 'NewExpression' || valueType === 'CallExpression';
    const scope = AstHelpers.isNode(value) ? context.sourceCode.getScope(value) : undefined;
    const result = isConstruction && scope !== undefined && typeof NativeConstructorName.resolve(AstHelpers.getNodeProperty(value, 'callee'), scope) === 'string';

    return result;
  }
}

export const noNativeError: Rule.RuleModule = {
  'create': (context) => {
    const options = NoNativeErrorOptionsEntity.intake(context.options.at(0) ?? {});
    const baseClassNames = new Set(options.baseClassNames);
    const passThroughMethods = options.passThroughMethods;

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

    const reportTypeIfNotBase = (messageId: string): RejectionCheckInterface['checkType'] => {
      const report = (type: ts.Type | undefined, anchor: Rule.Node): void => {
        const checker = TypeAccess.checker(context);

        const isExempt = EXEMPTABLE_MESSAGE_IDS.has(messageId) && PassThroughSite.contains(anchor, passThroughMethods);

        if (checker !== undefined && type !== undefined && !isExempt && !BaseErrorType.accepts(type, checker, baseClassNames)) {
          context.report({ 'data': { 'type': checker.typeToString(type) }, 'messageId': messageId, 'node': anchor });
        }
      };

      return report;
    };

    const reportValueIfNotBase = (messageId: string): RejectionCheckInterface['checkValue'] => {
      const reportType = reportTypeIfNotBase(messageId);
      const report = (value: unknown, anchor: Rule.Node): void => {
        const tsNode = TypeAccess.tsNode(value, context);
        const checker = TypeAccess.checker(context);

        if (tsNode !== undefined && checker !== undefined && !ReportedConstruction.is(value, context)) {
          reportType(checker.getTypeAtLocation(tsNode), anchor);
        }
      };

      return report;
    };

    const rejections = new RejectionTracker(context, {
      'checkType': reportTypeIfNotBase('nonBaseReject'),
      'checkValue': reportValueIfNotBase('nonBaseReject'),
      'isExempt': (node) => {
        const exempt = PassThroughSite.contains(node, passThroughMethods);

        return exempt;
      }
    });
    const reportAbortReason = reportValueIfNotBase('nonBaseAbortReason');
    const reportThrownValue = reportValueIfNotBase('nonBaseThrow');
    const reportThrownValueInCatch = reportValueIfNotBase('nonBaseThrowInCatch');

    const reportAbort = (node: Rule.Node): void => {
      const callee = AstHelpers.getNodeProperty(node, 'callee');
      const isController = AbortReceiver.isAbortController(AstHelpers.getNodeProperty(callee, 'object'), context);
      const argumentList = AstHelpers.getNodeProperty(node, 'arguments');
      const reason: unknown = Array.isArray(argumentList) ? argumentList.at(0) : undefined;

      if (AbortReceiver.isAbortCall(node, 0) && isController) {
        context.report({ 'messageId': 'abortWithoutReason', 'node': node });
      } else if (AbortReceiver.isAbortCall(node, undefined) && isController && AstHelpers.isNode(reason) && reason.type !== 'SpreadElement') {
        reportAbortReason(reason, reason);
      }
    };

    const platformCalls = new PlatformCallDetector(context, options.platformCalls);

    const reportPlatformCall = (node: Rule.Node): void => {
      const api = PlatformCallGuard.isGuarded(node) ? undefined : platformCalls.describe(node);

      if (typeof api === 'string') {
        context.report({ 'data': { 'api': api }, 'messageId': 'unguardedPlatformCall', 'node': node });
      }
    };

    const reportCall = (node: Rule.Node): void => {
      reportConstruction(node);
      reportPlatformCall(node);
      reportAbort(node);

      if (PromiseExecutor.isStaticReject(node, context)) {
        rejections.checkReason(node);
      }

      rejections.recordMemberCall(node);
      rejections.checkResolverCall(node);
    };

    const reportNewExpression = (node: Rule.Node): void => {
      reportConstruction(node);
      reportPlatformCall(node);
      rejections.trackExecutor(node);
      rejections.checkResolverCall(node);
    };

    const reportThrow = (node: Rule.Node): void => {
      const argument = AstHelpers.getNodeProperty(node, 'argument');

      if (AstHelpers.isNode(argument)) {
        (CatchClauseSite.contains(node) ? reportThrownValueInCatch : reportThrownValue)(argument, argument);
      }
    };

    const followStore = (node: Rule.Node): void => {
      rejections.followResolverStore(node);
    };

    const checkStoredCalls = (): void => {
      rejections.checkStoredCalls();
    };

    return {
      'AssignmentExpression': followStore,
      'CallExpression': reportCall,
      'ClassDeclaration': reportHeritage,
      'ClassExpression': reportHeritage,
      'ForOfStatement': reportPlatformCall,
      'MemberExpression': reportPlatformCall,
      'NewExpression': reportNewExpression,
      'Program:exit': checkStoredCalls,
      'Property': followStore,
      'ThrowStatement': reportThrow,
      'VariableDeclarator': followStore
    };
  },
  'meta': {
    'docs': {
      'description': 'Requires every emitted error to be a named BaseError subclass, never a native error constructor, a reasonless abort, a thrown, rejected, or aborted value that is not a BaseError, or an unguarded call to a platform API that throws a native error.',
      'recommended': false
    },
    'messages': {
      'abortWithoutReason': 'Pass a named BaseError subclass instance as the abort reason; a bare `abort()` rejects with a generic DOMException that carries no code.',
      'nativeConstruction': 'Construct a named BaseError subclass instead of the native `{{name}}`; every error this package emits carries a code and name.',
      'nativeHeritage': 'Extend BaseError instead of the native `{{name}}`; every error class this package declares carries a code and name.',
      'nonBaseAbortReason': 'The abort reason is typed `{{type}}`, not a BaseError. Abort with a named BaseError subclass instance, wrapping a platform error with the original as `cause`.',
      'nonBaseReject': 'The rejection reason is typed `{{type}}`, not a BaseError. Reject with a named BaseError subclass instance, wrap a platform error in one with the original as `cause`, or route an error raised by caller-supplied code through `CallerFault.propagate`.',
      'nonBaseThrow': 'The thrown value is typed `{{type}}`, not a BaseError. Throw a named BaseError subclass instance, wrap a platform error in one with the original as `cause`, or route an error raised by caller-supplied code through `CallerFault.propagate`.',
      'nonBaseThrowInCatch': 'The thrown value is typed `{{type}}`, not a BaseError. Narrow the `try` block so only the platform call or only the caller-supplied callback sits inside it, then wrap a platform error in a named BaseError subclass with the original as `cause`, or route an error raised by caller-supplied code through `CallerFault.propagate`.',
      'unguardedPlatformCall': 'The platform API `{{api}}` throws or rejects with a native error. Catch it in a `try` block with a `catch` clause (or a promise chain ending in `.catch`) and rethrow a named BaseError subclass with the original as `cause`, or handle it as an absence value.'
    },
    'schema': [NoNativeErrorOptionsEntity.Schema],
    'type': 'problem'
  }
};
