import type { Rule } from 'eslint';
import type ts from 'typescript';

import {
  getNameOfDeclaration,
  isCallExpression,
  isClassLike,
  isIdentifier,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isNewExpression,
  isPropertyAccessExpression,
  isSourceFile,
  isStringLiteral,
  isVariableDeclarationList,
  isVariableStatement,
  NodeFlags,
  SymbolFlags,
  TypeFlags
} from 'typescript';

import type { PlatformCallEntity } from '../PlatformCallEntity.js';

import {
  ANY,
  GLOBAL_OWNER,
  NODE_KIND_CALL,
  NODE_KIND_CONSTRUCT,
  NODE_KIND_ITERATE,
  NODE_KIND_READ,
  NODE_SCHEME,
  NODE_TYPES_PATH
} from '../constants/PlatformCallConstants.js';
import { AstHelpers } from './astHelpers.js';

interface PlatformKeyInterface {
  readonly 'member': string;
  readonly 'owners': readonly string[];
}

interface TsNodeMapInterface {
  get(key: unknown): ts.Node | undefined;
}

interface DetectionContextInterface {
  readonly 'checker': ts.TypeChecker;
  readonly 'iterated': unknown;
  readonly 'nodeMap': TsNodeMapInterface;
  readonly 'program': ts.Program;
  readonly 'tsNode': ts.Node;
}

/** Resolves a call, construction, or property read to a configured platform API through the checker's declarations, never through a bare name. */
export class PlatformCallDetector {
  readonly #context: Rule.RuleContext;
  readonly #entries: readonly PlatformCallEntity.Type[];
  readonly #readNames = new Set<string>();

  public constructor(context: Rule.RuleContext, entries: readonly PlatformCallEntity.Type[]) {
    this.#context = context;
    this.#entries = entries;

    const entryCount = entries.length;

    for (let index = 0; index < entryCount; index += 1) {
      const entry = entries[index];

      if (entry?.kind === NODE_KIND_READ) {
        this.#readNames.add(entry.member);
      }
    }
  }

  /** The API name (`JSON.parse`, `new URL`, `fs.readFileSync`) when `node` uses a configured platform API declared by the default lib or `@types/node`; `undefined` otherwise and without type-aware parser services. */
  public describe(node: Rule.Node): string | undefined {
    const services: unknown = this.#context.sourceCode.parserServices;
    const kind = PlatformCallDetector.kindOf(node);

    if (kind === undefined || !AstHelpers.hasTypeServices(services)) {
      return undefined;
    }

    const tsNode = services.esTreeNodeToTSNodeMap.get(node);
    const propertyName = kind === NODE_KIND_READ ? AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(node, 'property')) : undefined;
    const skipsRead = kind === NODE_KIND_READ && (propertyName === undefined || !this.#readNames.has(propertyName));

    if (tsNode === undefined || skipsRead) {
      return undefined;
    }

    const detection: DetectionContextInterface = { 'checker': services.program.getTypeChecker(), 'iterated': AstHelpers.getNodeProperty(node, 'right'), 'nodeMap': services.esTreeNodeToTSNodeMap, 'program': services.program, 'tsNode': tsNode };
    const result = this.#match(node, kind, PlatformCallDetector.keysOf(kind, detection), detection);

    return result;
  }

  private static kindOf(node: Rule.Node): PlatformCallEntity.Type['kind'] | undefined {
    const isAwaitLoop = node.type === 'ForOfStatement' && AstHelpers.getNodeProperty(node, 'await') === true;
    const kinds = new Map<string, PlatformCallEntity.Type['kind']>([
      ['CallExpression', NODE_KIND_CALL],
      ['MemberExpression', NODE_KIND_READ],
      ['NewExpression', NODE_KIND_CONSTRUCT]
    ]);
    const result = isAwaitLoop ? NODE_KIND_ITERATE : kinds.get(node.type);

    return result;
  }

  #match(node: Rule.Node, kind: PlatformCallEntity.Type['kind'], keys: readonly PlatformKeyInterface[], detection: DetectionContextInterface): string | undefined {
    const entryCount = this.#entries.length;

    for (let index = 0; index < entryCount; index += 1) {
      const entry = this.#entries[index];
      const key = entry?.kind === kind ? PlatformCallDetector.matchingKey(entry, keys) : undefined;

      if (entry !== undefined && key !== undefined) {
        const isReported = entry.safeWhenLiteral !== 'always' && !PlatformCallDetector.isSafe(node, entry.safeWhenLiteral, detection);
        const result = isReported ? PlatformCallDetector.label(kind, key, entry) : undefined;

        return result;
      }
    }

    return undefined;
  }

  private static matchingKey(entry: PlatformCallEntity.Type, keys: readonly PlatformKeyInterface[]): PlatformKeyInterface | undefined {
    const keyCount = keys.length;

    for (let index = 0; index < keyCount; index += 1) {
      const key = keys[index];
      const matches = key !== undefined && (entry.member === ANY || entry.member === key.member) && (entry.owner === ANY || key.owners.includes(entry.owner));

      if (matches) {
        return key;
      }
    }

    return undefined;
  }

  private static label(kind: PlatformCallEntity.Type['kind'], key: PlatformKeyInterface, entry: PlatformCallEntity.Type): string {
    const isQualified = entry.owner !== ANY && entry.owner !== GLOBAL_OWNER;
    const qualified = isQualified ? `${entry.owner}.${key.member}` : key.member;
    const labels = new Map<string, string>([[NODE_KIND_CONSTRUCT, `new ${key.member}`], [NODE_KIND_ITERATE, `for await over ${key.member}`]]);
    const result = labels.get(kind) ?? qualified;

    return result;
  }

  /** True when the literal-argument policy of an entry makes this use safe. */
  private static isSafe(node: Rule.Node, policy: PlatformCallEntity.Type['safeWhenLiteral'], detection: DetectionContextInterface): boolean {
    const argumentList = AstHelpers.getNodeProperty(node, 'arguments');
    const argumentNodes: unknown[] = Array.isArray(argumentList) ? argumentList : [];
    const first = argumentNodes.at(0);

    if (policy === 'everyArgument') {
      const everyLiteral = argumentNodes.every((argument) => {
        const literal = PlatformCallDetector.isLiteral(argument, detection);

        return literal;
      });

      return everyLiteral;
    }

    if (policy === 'firstArgument') {
      const firstLiteral = first === undefined || PlatformCallDetector.isLiteral(first, detection);

      return firstLiteral;
    }

    if (policy === 'soleArgument') {
      const notSole = argumentNodes.length !== 1 || PlatformCallDetector.isLiteral(first, detection);

      return notSole;
    }

    const lengthLiteral = policy === 'firstArgumentLength' && PlatformCallDetector.hasLiteralLength(first, detection);

    return lengthLiteral;
  }

  /** True for a syntactic literal or plain template, and for any expression the checker types as a string, number, or bigint literal (a `const` identifier, an `as const` member, a readonly literal-typed property). */
  private static isLiteral(argument: unknown, detection: DetectionContextInterface): boolean {
    const type = AstHelpers.getNodeType(argument);
    const expressions = AstHelpers.getNodeProperty(argument, 'expressions');
    const isPlainTemplate = type === 'TemplateLiteral' && Array.isArray(expressions) && expressions.length === 0;
    const tsArgument = type === undefined || type === 'Literal' || isPlainTemplate ? undefined : detection.nodeMap.get(argument);
    const isLiteralTyped = tsArgument !== undefined && PlatformCallDetector.isLiteralType(detection.checker.getTypeAtLocation(tsArgument));
    const result = type === 'Literal' || isPlainTemplate || isLiteralTyped;

    return result;
  }

  private static isLiteralType(type: ts.Type): boolean {
    const result = type.isUnion()
      ? type.types.every((member) => {
        const literal = PlatformCallDetector.isLiteralType(member);

        return literal;
      })
      : type.isStringLiteral() || type.isNumberLiteral() || (type.flags & TypeFlags.BigIntLiteral) !== 0;

    return result;
  }

  /** True unless `argument` is an object literal whose `length` property is not a literal. */
  private static hasLiteralLength(argument: unknown, detection: DetectionContextInterface): boolean {
    const properties = AstHelpers.getNodeType(argument) === 'ObjectExpression' ? AstHelpers.getNodeProperty(argument, 'properties') : undefined;
    const propertyNodes: unknown[] = Array.isArray(properties) ? properties : [];
    const propertyCount = propertyNodes.length;

    for (let index = 0; index < propertyCount; index += 1) {
      const key = AstHelpers.getNodeProperty(propertyNodes[index], 'key');
      const isLength = AstHelpers.getIdentifierName(key) === 'length' || AstHelpers.getNodeProperty(key, 'value') === 'length';

      if (isLength) {
        const literalLength = PlatformCallDetector.isLiteral(AstHelpers.getNodeProperty(propertyNodes[index], 'value'), detection);

        return literalLength;
      }
    }

    return true;
  }

  private static keysOf(kind: PlatformCallEntity.Type['kind'], detection: DetectionContextInterface): PlatformKeyInterface[] {
    const declarations = PlatformCallDetector.declarationsOf(kind, detection);
    const keys: PlatformKeyInterface[] = [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index += 1) {
      const declaration = declarations[index];
      const key = declaration === undefined ? undefined : PlatformCallDetector.keyOf(declaration, detection.program);

      if (key !== undefined) {
        keys.push(key);
      }
    }

    return keys;
  }

  /** The declarations a use resolves to: a call's resolved signature and callee symbol, a construction's class symbol, or a read's property symbol. */
  private static declarationsOf(kind: PlatformCallEntity.Type['kind'], detection: DetectionContextInterface): readonly ts.Declaration[] {
    const { checker, tsNode } = detection;

    if (kind === NODE_KIND_CALL && isCallExpression(tsNode)) {
      const signatureDeclaration = checker.getResolvedSignature(tsNode)?.declaration;
      const calleeDeclarations = PlatformCallDetector.symbolDeclarations(tsNode.expression, checker);

      const callDeclarations = signatureDeclaration === undefined ? calleeDeclarations : [signatureDeclaration, ...calleeDeclarations];

      return callDeclarations;
    }

    if (kind === NODE_KIND_CONSTRUCT && isNewExpression(tsNode)) {
      const constructedDeclarations = PlatformCallDetector.symbolDeclarations(tsNode.expression, checker);

      return constructedDeclarations;
    }

    const otherDeclarations = kind === NODE_KIND_ITERATE ? PlatformCallDetector.iteratedDeclarations(detection) : PlatformCallDetector.readDeclarations(kind, detection);

    return otherDeclarations;
  }

  /** The declarations of the type a `for await` loop iterates. */
  private static iteratedDeclarations(detection: DetectionContextInterface): readonly ts.Declaration[] {
    const iterated = detection.nodeMap.get(detection.iterated);
    const result = iterated === undefined ? [] : detection.checker.getTypeAtLocation(iterated).getSymbol()?.declarations ?? [];

    return result;
  }

  private static readDeclarations(kind: PlatformCallEntity.Type['kind'], detection: DetectionContextInterface): readonly ts.Declaration[] {
    const result = kind === NODE_KIND_READ && isPropertyAccessExpression(detection.tsNode) ? PlatformCallDetector.symbolDeclarations(detection.tsNode.name, detection.checker) : [];

    return result;
  }

  private static symbolDeclarations(node: ts.Node, checker: ts.TypeChecker): readonly ts.Declaration[] {
    const symbol = checker.getSymbolAtLocation(node);
    const resolved = symbol !== undefined && (symbol.flags & SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
    const result = resolved?.declarations ?? [];

    return result;
  }

  private static keyOf(declaration: ts.Declaration, program: ts.Program): PlatformKeyInterface | undefined {
    const sourceFile = declaration.getSourceFile();
    const isPlatform = program.isSourceFileDefaultLibrary(sourceFile) || NODE_TYPES_PATH.test(sourceFile.fileName);
    const name = getNameOfDeclaration(declaration);
    const member = name !== undefined && (isIdentifier(name) || isStringLiteral(name)) ? name.text : undefined;
    const owners = PlatformCallDetector.ownersOf(PlatformCallDetector.scopeOf(declaration.parent));

    if (isPlatform && typeof member === 'string' && owners.length > 0) {
      return { 'member': member, 'owners': owners };
    }

    return undefined;
  }

  /** The node that scopes a declaration: a variable declaration's list and statement are skipped. */
  private static scopeOf(parent: ts.Node): ts.Node {
    const statement = isVariableDeclarationList(parent) ? parent.parent : parent;
    const result = isVariableStatement(statement) ? statement.parent : statement;

    return result;
  }

  /** The owner name of a module declaration: its name without the `node:` prefix, or the global owner for a `declare global` block. */
  private static moduleOwner(declaration: ts.ModuleDeclaration): string {
    const isGlobalBlock = (declaration.flags & NodeFlags.GlobalAugmentation) !== 0;
    const result = isGlobalBlock ? GLOBAL_OWNER : declaration.name.text.replace(NODE_SCHEME, '');

    return result;
  }

  /** The names that own a declaration: its interface or class, every enclosing module (`node:` prefix removed), or the empty string for a global. */
  private static ownersOf(parent: ts.Node): readonly string[] {
    if (isSourceFile(parent)) {
      const globalOwners = [GLOBAL_OWNER];

      return globalOwners;
    }

    if (isInterfaceDeclaration(parent) || isClassLike(parent)) {
      const declaredOwners = typeof parent.name?.text === 'string' ? [parent.name.text] : [];

      return declaredOwners;
    }

    const owners: string[] = [];
    let current: ts.Node | undefined = parent;

    while (current !== undefined && (isModuleBlock(current) || isModuleDeclaration(current))) {
      if (isModuleDeclaration(current)) {
        owners.push(PlatformCallDetector.moduleOwner(current));
      }

      current = current.parent;
    }

    return owners;
  }
}
