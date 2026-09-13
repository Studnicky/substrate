import * as TypeScript from 'typescript';


export class ContextAsyncTransform {
  static readonly #supportedExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

  static bind(contextRuntimeModule: string): () => ReturnType<typeof ContextAsyncTransform.create> {
    const result = () => {
      const transform = ContextAsyncTransform.create(contextRuntimeModule);
      return transform;
    };
    return result;
  }

  static create(contextRuntimeModule: string): {
    'enforce': 'pre';
    'name': string;
    'transform': (code: string, id: string) => { 'code': string; 'map': null } | null;
  } {
    const result: {
      'enforce': 'pre';
      'name': string;
      'transform': (code: string, id: string) => { 'code': string; 'map': null } | null;
    } = {
      'enforce': 'pre',
      'name': 'studnicky-context-async',
      'transform': (code: string, id: string) => {
        const transformedCode = ContextAsyncTransform.#transformCode(code, id, contextRuntimeModule);
        return transformedCode;
      }
    };
    return result;
  }

  static #normalizeSourceId(id: string): string {
    const normalizedId = id.replaceAll('\\', '/');
    const queryIndex = normalizedId.indexOf('?');
    const fragmentIndex = normalizedId.indexOf('#');
    const parameterIndex = queryIndex === -1 || fragmentIndex !== -1 && fragmentIndex < queryIndex
      ? fragmentIndex
      : queryIndex;
    const result = parameterIndex === -1 ? normalizedId : normalizedId.slice(0, parameterIndex);
    return result;
  }

  static #resolveScriptKind(id: string): TypeScript.ScriptKind {
    const extension = id.slice(id.lastIndexOf('.')).toLowerCase();
    const kindByExtension = new Map<string, TypeScript.ScriptKind>([
      ['.cjs', TypeScript.ScriptKind.JS],
      ['.cts', TypeScript.ScriptKind.TS],
      ['.js', TypeScript.ScriptKind.JS],
      ['.jsx', TypeScript.ScriptKind.JSX],
      ['.mjs', TypeScript.ScriptKind.JS],
      ['.mts', TypeScript.ScriptKind.TS],
      ['.ts', TypeScript.ScriptKind.TS],
      ['.tsx', TypeScript.ScriptKind.TSX]
    ]);
    const result = kindByExtension.get(extension);

    if (result === undefined) {
      throw new Error(`Unsupported source extension: ${extension}`);
    }

    return result;
  }

  static #isTransformable(id: string): boolean {
    const normalizedId = id.replaceAll('\\', '/');
    const extension = normalizedId.slice(normalizedId.lastIndexOf('.')).toLowerCase();
    const result = ContextAsyncTransform.#supportedExtensions.has(extension)
      && !normalizedId.includes('/node_modules/')
      && !normalizedId.endsWith('.d.ts')
      && !normalizedId.endsWith('.d.mts')
      && !normalizedId.endsWith('.d.cts');
    return result;
  }

  static #findImportedRuntimeIdentifier(sourceFile: TypeScript.SourceFile, contextRuntimeModule: string): TypeScript.Identifier | undefined {
    for (const statement of sourceFile.statements) {
      if (!TypeScript.isImportDeclaration(statement) || !TypeScript.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== contextRuntimeModule) {
        continue;
      }

      const namedBindings = statement.importClause?.namedBindings;
      if (namedBindings === undefined || !TypeScript.isNamedImports(namedBindings)) {
        continue;
      }

      for (const element of namedBindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (importedName === 'ContextAsyncRuntime') {
          const result = element.name;
          return result;
        }
      }
    }

    return undefined;
  }

  static #createUniqueRuntimeIdentifier(sourceFile: TypeScript.SourceFile): TypeScript.Identifier {
    const names = new Set<string>();

    const collect = (node: TypeScript.Node): void => {
      if (TypeScript.isIdentifier(node)) {
        names.add(node.text);
      }
      TypeScript.forEachChild(node, collect);
    };
    collect(sourceFile);

    const baseName = '__contextAsyncRuntime';
    let name = baseName;
    let suffix = 1;
    while (names.has(name)) {
      name = `${baseName}${String(suffix)}`;
      suffix += 1;
    }

    const result = TypeScript.factory.createIdentifier(name);
    return result;
  }

  static #isContextRuntimeAwait(expression: TypeScript.Expression, runtimeIdentifier: TypeScript.Identifier): boolean {
    const result = TypeScript.isCallExpression(expression)
      && TypeScript.isPropertyAccessExpression(expression.expression)
      && TypeScript.isIdentifier(expression.expression.expression)
      && expression.expression.expression.text === runtimeIdentifier.text
      && expression.expression.name.text === 'await';
    return result;
  }

  static #createImportStatement(runtimeIdentifier: TypeScript.Identifier, contextRuntimeModule: string): TypeScript.ImportDeclaration {
    const importedName = TypeScript.factory.createIdentifier('ContextAsyncRuntime');
    const importSpecifier = TypeScript.factory.createImportSpecifier(
      false,
      importedName.text === runtimeIdentifier.text ? undefined : importedName,
      runtimeIdentifier
    );
    const namedImports = TypeScript.factory.createNamedImports([importSpecifier]);
    const importClause = TypeScript.factory.createImportClause(false, undefined, namedImports);
    const result = TypeScript.factory.createImportDeclaration(
      undefined,
      importClause,
      TypeScript.factory.createStringLiteral(contextRuntimeModule),
      undefined
    );
    return result;
  }

  static #getInsertionIndex(statements: TypeScript.NodeArray<TypeScript.Statement>): number {
    let result = 0;

    for (const statement of statements) {
      if (!TypeScript.isExpressionStatement(statement) || !TypeScript.isStringLiteral(statement.expression)) {
        return result;
      }
      result += 1;
    }

    return result;
  }

  static #transformCode(code: string, id: string, contextRuntimeModule: string): { 'code': string; 'map': null } | null {
    const sourceId = ContextAsyncTransform.#normalizeSourceId(id);
    if (!ContextAsyncTransform.#isTransformable(sourceId)) {
      return null;
    }

    const sourceFile = TypeScript.createSourceFile(sourceId, code, TypeScript.ScriptTarget.Latest, true, ContextAsyncTransform.#resolveScriptKind(sourceId));
    const existingRuntimeIdentifier = ContextAsyncTransform.#findImportedRuntimeIdentifier(sourceFile, contextRuntimeModule);
    const runtimeIdentifier = existingRuntimeIdentifier ?? ContextAsyncTransform.#createUniqueRuntimeIdentifier(sourceFile);
    let transformedAwaitCount = 0;

    const transformer: TypeScript.TransformerFactory<TypeScript.SourceFile> = (context) => {
      const visit = (node: TypeScript.Node): TypeScript.VisitResult<TypeScript.Node> => {
        if (TypeScript.isAwaitExpression(node)) {
          const expression = TypeScript.visitNode(node.expression, visit);
          if (TypeScript.isExpression(expression) && ContextAsyncTransform.#isContextRuntimeAwait(expression, runtimeIdentifier)) {
            const result = TypeScript.factory.updateAwaitExpression(node, expression);
            return result;
          }

          if (TypeScript.isExpression(expression)) {
            transformedAwaitCount += 1;
            const result = TypeScript.factory.updateAwaitExpression(
              node,
              TypeScript.factory.createCallExpression(
                TypeScript.factory.createPropertyAccessExpression(runtimeIdentifier, 'await'),
                undefined,
                [expression]
              )
            );
            return result;
          }
        }

        const result = TypeScript.visitEachChild(node, visit, context);
        return result;
      };

      return (file) => {
        const result = TypeScript.visitEachChild(file, visit, context);
        return result;
      };
    };

    const transformation = TypeScript.transform(sourceFile, [transformer]);
    const transformedSourceFile = transformation.transformed[0];
    transformation.dispose();

    if (transformedAwaitCount === 0 || transformedSourceFile === undefined) {
      return null;
    }

    const statements = [...transformedSourceFile.statements];
    if (existingRuntimeIdentifier === undefined) {
      statements.splice(ContextAsyncTransform.#getInsertionIndex(transformedSourceFile.statements), 0, ContextAsyncTransform.#createImportStatement(runtimeIdentifier, contextRuntimeModule));
    }

    const output = TypeScript.factory.updateSourceFile(
      transformedSourceFile,
      TypeScript.factory.createNodeArray(statements)
    );
    const printer = TypeScript.createPrinter({ 'newLine': TypeScript.NewLineKind.LineFeed });
    const result = {
      'code': printer.printFile(output),
      'map': null
    };
    return result;
  }
}
