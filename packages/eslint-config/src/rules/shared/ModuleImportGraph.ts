import {
  isExportDeclaration, isImportDeclaration, isSourceFile, isStringLiteral, type Node, type Program, type SourceFile, type TypeChecker
} from 'typescript';

interface StrongConnectFrameInterface {
  'childIndex': number;
  readonly 'children': readonly SourceFile[];
  readonly 'node': SourceFile;
}

interface TarjanStateInterface {
  readonly 'componentIdBySourceFile': Map<SourceFile, number>;
  readonly 'componentSizeByComponentId': Map<number, number>;
  readonly 'edges': ReadonlyMap<SourceFile, ReadonlySet<SourceFile>>;
  readonly 'indexBySourceFile': Map<SourceFile, number>;
  readonly 'lowlinkBySourceFile': Map<SourceFile, number>;
  'nextComponentId': number;
  'nextIndex': number;
  readonly 'onStack': Set<SourceFile>;
  readonly 'stack': SourceFile[];
}

/**
 * The in-repo `packages/*\/src` module import graph for a `Program`, partitioned into
 * strongly-connected components (Tarjan's algorithm, run iteratively — a linear import
 * chain across hundreds of files would blow the call stack recursively). An edge whose
 * endpoints share a multi-file component is a circular import; {@link closesCycle} answers
 * exactly that question for the arch/no-circular-imports rule's per-import-declaration check.
 */
export class ModuleImportGraph {
  private static readonly graphsByProgram = new WeakMap<Program, ModuleImportGraph>();

  private readonly componentIdBySourceFile = new Map<SourceFile, number>();
  private readonly componentSizeByComponentId = new Map<number, number>();

  private constructor(program: Program) {
    const edges = ModuleImportGraph.collectEdges(program);
    const state: TarjanStateInterface = {
      'componentIdBySourceFile': this.componentIdBySourceFile,
      'componentSizeByComponentId': this.componentSizeByComponentId,
      'edges': edges,
      'indexBySourceFile': new Map<SourceFile, number>(),
      'lowlinkBySourceFile': new Map<SourceFile, number>(),
      'nextComponentId': 0,
      'nextIndex': 0,
      'onStack': new Set<SourceFile>(),
      'stack': []
    };

    ModuleImportGraph.assignComponents(state);
  }

  public static forProgram(program: Program): ModuleImportGraph {
    const cached = ModuleImportGraph.graphsByProgram.get(program);

    if (cached !== undefined) {
      return cached;
    }

    const graph = new ModuleImportGraph(program);

    ModuleImportGraph.graphsByProgram.set(program, graph);

    return graph;
  }

  /** True when `from` importing `to` is an edge inside a cycle — same multi-file component, or a direct self-import. */
  public closesCycle(from: SourceFile, to: SourceFile): boolean {
    if (from === to) {
      return true;
    }

    const fromComponent = this.componentIdBySourceFile.get(from);
    const toComponent = this.componentIdBySourceFile.get(to);

    if (fromComponent === undefined || fromComponent !== toComponent) {
      return false;
    }

    const result = (this.componentSizeByComponentId.get(fromComponent) ?? 0) > 1;

    return result;
  }

  /** Resolves the `SourceFile` an import/export statement's module specifier points at, or `undefined` for a bare specifier, self-import, or unresolved module. */
  public static resolveStatementTarget(sourceFile: SourceFile, statement: Node, checker: TypeChecker): SourceFile | undefined {
    if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
      return undefined;
    }

    const moduleSpecifier = statement.moduleSpecifier;

    if (moduleSpecifier === undefined || !isStringLiteral(moduleSpecifier)) {
      return undefined;
    }

    const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
    const target = moduleSymbol?.getDeclarations()?.find(isSourceFile);
    const result = target === sourceFile ? undefined : target;

    return result;
  }

  private static isInScope(sourceFile: SourceFile): boolean {
    if (sourceFile.isDeclarationFile) {
      return false;
    }

    const filename = sourceFile.fileName.split('\\').join('/');
    const result = filename.includes('/packages/') && filename.includes('/src/') && !filename.includes('/node_modules/');

    return result;
  }

  private static collectEdges(program: Program): ReadonlyMap<SourceFile, ReadonlySet<SourceFile>> {
    const checker = program.getTypeChecker();
    const edges = new Map<SourceFile, Set<SourceFile>>();
    const sourceFiles = program.getSourceFiles().filter(ModuleImportGraph.isInScope);
    const sourceFileCount = sourceFiles.length;

    for (let index = 0; index < sourceFileCount; index += 1) {
      const sourceFile = sourceFiles[index]!;

      edges.set(sourceFile, ModuleImportGraph.edgesForFile(sourceFile, checker));
    }

    return edges;
  }

  private static edgesForFile(sourceFile: SourceFile, checker: TypeChecker): Set<SourceFile> {
    const targets = new Set<SourceFile>();
    const statements = sourceFile.statements;
    const statementCount = statements.length;

    for (let index = 0; index < statementCount; index += 1) {
      const target = ModuleImportGraph.resolveStatementTarget(sourceFile, statements[index]!, checker);

      if (target !== undefined && ModuleImportGraph.isInScope(target)) {
        targets.add(target);
      }
    }

    return targets;
  }

  private static allocateIndex(state: TarjanStateInterface): number {
    const index = state.nextIndex;

    state.nextIndex += 1;

    return index;
  }

  private static assignComponents(state: TarjanStateInterface): void {
    const nodes = [...state.edges.keys()];
    const nodeCount = nodes.length;

    for (let index = 0; index < nodeCount; index += 1) {
      const node = nodes[index]!;

      if (!state.indexBySourceFile.has(node)) {
        ModuleImportGraph.strongConnect(node, state);
      }
    }
  }

  // Iterative Tarjan's SCC over an explicit frame stack — the recursive form re-enters once
  // per edge on a straight-line import chain, which a large monorepo's dependency depth can
  // exceed the call stack for.
  private static strongConnect(start: SourceFile, state: TarjanStateInterface): void {
    const frames: StrongConnectFrameInterface[] = [ModuleImportGraph.openFrame(start, state)];

    while (frames.length > 0) {
      const frame = frames.at(-1)!;

      if (frame.childIndex < frame.children.length) {
        const child = frame.children[frame.childIndex]!;

        frame.childIndex += 1;
        ModuleImportGraph.visitChild(frame.node, child, state, frames);
        continue;
      }

      frames.pop();
      ModuleImportGraph.closeFrame(frame.node, frames, state);
    }
  }

  private static openFrame(node: SourceFile, state: TarjanStateInterface): StrongConnectFrameInterface {
    const index = ModuleImportGraph.allocateIndex(state);

    state.indexBySourceFile.set(node, index);
    state.lowlinkBySourceFile.set(node, index);
    state.stack.push(node);
    state.onStack.add(node);

    return {
      'childIndex': 0, 'children': [...(state.edges.get(node) ?? [])], 'node': node
    };
  }

  private static visitChild(node: SourceFile, child: SourceFile, state: TarjanStateInterface, frames: StrongConnectFrameInterface[]): void {
    if (!state.indexBySourceFile.has(child)) {
      frames.push(ModuleImportGraph.openFrame(child, state));

      return;
    }

    if (state.onStack.has(child)) {
      const nodeLowlink = state.lowlinkBySourceFile.get(node)!;
      const childIndex = state.indexBySourceFile.get(child)!;

      state.lowlinkBySourceFile.set(node, Math.min(nodeLowlink, childIndex));
    }
  }

  private static closeFrame(node: SourceFile, frames: StrongConnectFrameInterface[], state: TarjanStateInterface): void {
    const parentFrame = frames.at(-1);

    if (parentFrame !== undefined) {
      const parentLowlink = state.lowlinkBySourceFile.get(parentFrame.node)!;
      const nodeLowlink = state.lowlinkBySourceFile.get(node)!;

      state.lowlinkBySourceFile.set(parentFrame.node, Math.min(parentLowlink, nodeLowlink));
    }

    if (state.lowlinkBySourceFile.get(node) !== state.indexBySourceFile.get(node)) {
      return;
    }

    const componentId = state.nextComponentId;

    state.nextComponentId += 1;

    const members: SourceFile[] = [];
    let member: SourceFile | undefined;

    do {
      member = state.stack.pop();

      if (member === undefined) {
        break;
      }
      state.onStack.delete(member);
      members.push(member);
      state.componentIdBySourceFile.set(member, componentId);
    } while (member !== node);

    state.componentSizeByComponentId.set(componentId, members.length);
  }
}
