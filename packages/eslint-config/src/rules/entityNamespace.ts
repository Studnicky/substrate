import type { Rule } from 'eslint';

import path from 'node:path';

const ENTITY_FILE_REGEX = /Entity\.[cm]?[tj]sx?$/v;
const ENTITY_DIR_REGEX = /\/entities\//v;

const INDEX_FILES = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

class PathGuards {
  static isEntityFile(filename: string): boolean {
    if (INDEX_FILES.has(path.basename(filename))) { return false; }
    const normalized = filename.split(path.sep).join('/');
    return ENTITY_FILE_REGEX.test(normalized) || ENTITY_DIR_REGEX.test(normalized);
  }
}

class TypeGuards {
  static isJsonObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}

class AstHelpers {
  public static getEntityBaseName(filename: string): string {
    const result = path.basename(filename).replace(/\.[cm]?[tj]sx?$/v, '');
    return result;
  }

  public static getNodeType(node: unknown): string | undefined {
    if (!TypeGuards.isJsonObject(node)) { return undefined; }
    const { type } = node;
    return typeof type === 'string' ? type : undefined;
  }

  public static getIdName(node: unknown): string | undefined {
    if (!TypeGuards.isJsonObject(node)) { return undefined; }
    const { id } = node;
    if (!TypeGuards.isJsonObject(id)) { return undefined; }
    const { name } = id;
    return typeof name === 'string' ? name : undefined;
  }

  public static getDeclaration(node: unknown): unknown {
    if (!TypeGuards.isJsonObject(node)) { return undefined; }
    return node.declaration;
  }
}

type NamespaceMembersType = {
  'hasSchema': boolean;
  'hasSchemaAsConst': boolean;
  'hasType': boolean;
  'hasTypeFromSchema': boolean;
  'hasValidate': boolean;
  'hasValidateTypeGuard': boolean;
};

class SchemaMemberGuards {
  static isConstTypeAnnotation(typeAnnotation: unknown): boolean {
    if (!TypeGuards.isJsonObject(typeAnnotation)) { return false; }
    // @typescript-eslint/parser represents `as const` as either:
    //   TSTypeOperator { operator: 'const' }  (some versions)
    //   TSTypeReference { typeName: { name: 'const' } }  (other versions / this runtime)
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeOperator') {
      return (typeAnnotation).operator === 'const';
    }
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeReference') {
      const { typeName } = typeAnnotation;
      return TypeGuards.isJsonObject(typeName) && (typeName).name === 'const';
    }
    return false;
  }

  static isSchemaAsConst(declarator: unknown): boolean {
    if (!TypeGuards.isJsonObject(declarator)) { return false; }
    const { init } = declarator;
    if (!TypeGuards.isJsonObject(init)) { return false; }
    const initType = AstHelpers.getNodeType(init);
    // Plain: `{ ... } as const`
    if (initType === 'TSAsExpression') {
      return SchemaMemberGuards.isConstTypeAnnotation(init.typeAnnotation);
    }
    // `{ ... } as const satisfies T` — TypeScript processes as (literal as const) satisfies T
    // so the outer node is TSSatisfiesExpression wrapping a TSAsExpression
    if (initType === 'TSSatisfiesExpression') {
      const { expression } = init;
      if (!TypeGuards.isJsonObject(expression) || AstHelpers.getNodeType(expression) !== 'TSAsExpression') { return false; }
      return SchemaMemberGuards.isConstTypeAnnotation(expression.typeAnnotation);
    }
    return false;
  }

  static isFromSchemaRef(typeAnnotation: unknown): boolean {
    if (!TypeGuards.isJsonObject(typeAnnotation) || AstHelpers.getNodeType(typeAnnotation) !== 'TSTypeReference') { return false; }
    const { typeName } = typeAnnotation;
    if (!TypeGuards.isJsonObject(typeName)) { return false; }
    // Handle both plain Identifier and qualified name (e.g. Ns.FromSchema)
    const fromSchemaName =
      typeName.name === 'FromSchema' ||
      (TypeGuards.isJsonObject(typeName.right) && (typeName.right).name === 'FromSchema');
    if (!fromSchemaName) { return false; }
    // Check type arguments/parameters contains exactly one TSTypeQuery for `typeof Schema`
    let typeParams: Record<string, unknown> | undefined;
    if (TypeGuards.isJsonObject(typeAnnotation.typeParameters)) {
      typeParams = typeAnnotation.typeParameters;
    } else if (TypeGuards.isJsonObject(typeAnnotation.typeArguments)) {
      typeParams = typeAnnotation.typeArguments;
    }
    if (!TypeGuards.isJsonObject(typeParams)) { return false; }
    const { params } = typeParams;
    if (!Array.isArray(params) || params.length !== 1) { return false; }
    const arg: unknown = params[0];
    if (!TypeGuards.isJsonObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeQuery') { return false; }
    const { exprName } = arg;
    if (!TypeGuards.isJsonObject(exprName)) { return false; }
    return (exprName).name === 'Schema';
  }

  static isTypeFromSchema(decl: unknown): boolean {
    if (!TypeGuards.isJsonObject(decl)) { return false; }
    const { typeAnnotation } = decl;
    if (!TypeGuards.isJsonObject(typeAnnotation)) { return false; }
    // Plain: `type Type = FromSchema<typeof Schema>`
    if (SchemaMemberGuards.isFromSchemaRef(typeAnnotation)) { return true; }
    // Intersection: `type Type = FromSchema<typeof Schema> & { ... }`
    // Accept when the first member of the intersection is FromSchema<typeof Schema>
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSIntersectionType') {
      const { types } = typeAnnotation;
      if (!Array.isArray(types) || types.length < 2) { return false; }
      return SchemaMemberGuards.isFromSchemaRef(types[0]);
    }
    return false;
  }

  // Recognises `SchemaValidator.compile<Type>(Schema)` — the schema-derived
  // validator form. The compiled Ajv `ValidateFunction<Type>` is itself a
  // `(candidate: unknown) => candidate is Type` predicate, so a `const validate`
  // bound to it is a valid type guard with zero hand-written constraint logic.
  static isSchemaValidatorCompile(init: unknown): boolean {
    if (!TypeGuards.isJsonObject(init) || AstHelpers.getNodeType(init) !== 'CallExpression') { return false; }
    const { callee } = init;
    if (!TypeGuards.isJsonObject(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    const { object, property } = callee;
    if (!TypeGuards.isJsonObject(object) || (object).name !== 'SchemaValidator') { return false; }
    if (!TypeGuards.isJsonObject(property) || (property).name !== 'compile') { return false; }
    // Require an explicit `<Type>` argument so the guard narrows to the entity Type.
    let typeParams: unknown = init.typeArguments;
    if (!TypeGuards.isJsonObject(typeParams)) { typeParams = init.typeParameters; }
    if (!TypeGuards.isJsonObject(typeParams)) { return false; }
    const { params } = typeParams;
    if (!Array.isArray(params) || params.length !== 1) { return false; }
    const arg: unknown = params[0];
    if (!TypeGuards.isJsonObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') { return false; }
    const { typeName } = arg;
    return TypeGuards.isJsonObject(typeName) && (typeName).name === 'Type';
  }

  static isValidateTypeGuard(decl: unknown): boolean {
    if (!TypeGuards.isJsonObject(decl)) { return false; }
    const declType = AstHelpers.getNodeType(decl);

    // `export const validate = SchemaValidator.compile<Type>(Schema)` — the
    // schema-as-source-of-truth form. No explicit predicate annotation needed.
    if (declType === 'VariableDeclaration') {
      const { declarations } = decl;
      if (Array.isArray(declarations) && declarations.length > 0 && TypeGuards.isJsonObject(declarations[0])) {
        const firstDeclarator = declarations[0];
        if (SchemaMemberGuards.isSchemaValidatorCompile(firstDeclarator.init)) { return true; }
      }
    }

    let returnType: unknown;
    let firstParamName: string | undefined;

    if (declType === 'FunctionDeclaration') {
      returnType = decl.returnType;
      const { params } = decl;
      if (Array.isArray(params) && params.length > 0 && TypeGuards.isJsonObject(params[0])) {
        const p = params[0];
        if (TypeGuards.isJsonObject(p.name)) {
          firstParamName = (p.name).name as string | undefined;
        } else {
          firstParamName = p.name as string | undefined;
        }
      }
    } else if (declType === 'VariableDeclaration') {
      // const validate = (...): candidate is Type => { ... }
      const { declarations } = decl;
      if (!Array.isArray(declarations) || declarations.length === 0) { return false; }
      const declarator: unknown = declarations[0];
      if (!TypeGuards.isJsonObject(declarator)) { return false; }
      const { init } = declarator;
      if (!TypeGuards.isJsonObject(init)) { return false; }
      const initType = AstHelpers.getNodeType(init);
      // ArrowFunctionExpression or FunctionExpression
      if (initType !== 'ArrowFunctionExpression' && initType !== 'FunctionExpression') { return false; }
      returnType = init.returnType;
      const { params } = init;
      if (Array.isArray(params) && params.length > 0 && TypeGuards.isJsonObject(params[0])) {
        const p = params[0];
        if (TypeGuards.isJsonObject(p.name)) {
          firstParamName = (p.name).name as string | undefined;
        } else {
          firstParamName = p.name as string | undefined;
        }
      }
    } else {
      return false;
    }

    // returnType may be wrapped in a TSTypeAnnotation node
    let predicateNode: unknown = returnType;
    if (TypeGuards.isJsonObject(predicateNode) && AstHelpers.getNodeType(predicateNode) === 'TSTypeAnnotation') {
      predicateNode = (predicateNode).typeAnnotation;
    }
    if (!TypeGuards.isJsonObject(predicateNode) || AstHelpers.getNodeType(predicateNode) !== 'TSTypePredicate') { return false; }
    const predicate = predicateNode;

    // parameterName must match firstParamName
    if (TypeGuards.isJsonObject(predicate.parameterName)) {
      const pName = (predicate.parameterName).name;
      if (pName !== firstParamName) { return false; }
    } else {
      return false;
    }

    // typeAnnotation of predicate must reference Type
    const predTypeAnnotation = predicate.typeAnnotation;
    if (!TypeGuards.isJsonObject(predTypeAnnotation)) { return false; }
    // May be wrapped in TSTypeAnnotation
    let refNode: unknown = predTypeAnnotation;
    if (AstHelpers.getNodeType(refNode) === 'TSTypeAnnotation') {
      refNode = (refNode as Record<string, unknown>).typeAnnotation;
    }
    if (!TypeGuards.isJsonObject(refNode) || AstHelpers.getNodeType(refNode) !== 'TSTypeReference') { return false; }
    const { typeName } = refNode;
    if (!TypeGuards.isJsonObject(typeName)) { return false; }
    return (typeName).name === 'Type';
  }
}

class NamespaceScanner {
  static scanBody(bodyNode: unknown): NamespaceMembersType {
    const result: NamespaceMembersType = {
      'hasSchema': false,
      'hasSchemaAsConst': false,
      'hasType': false,
      'hasTypeFromSchema': false,
      'hasValidate': false,
      'hasValidateTypeGuard': false
    };

    if (!TypeGuards.isJsonObject(bodyNode)) { return result; }
    const { body } = bodyNode;
    if (!Array.isArray(body)) { return result; }

    for (const stmt of body) {
      if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') { continue; }
      const decl = AstHelpers.getDeclaration(stmt);
      const declType = AstHelpers.getNodeType(decl);

      if (declType === 'VariableDeclaration') {
        if (!TypeGuards.isJsonObject(decl)) { continue; }
        const { declarations } = decl;
        if (!Array.isArray(declarations)) { continue; }
        for (const d of declarations) {
          if (!TypeGuards.isJsonObject(d) || !TypeGuards.isJsonObject(d.id)) { continue; }
          const { name } = d.id;
          if (name === 'Schema') {
            result.hasSchema = true;
            result.hasSchemaAsConst = SchemaMemberGuards.isSchemaAsConst(d);
          }
          if (name === 'validate') {
            result.hasValidate = true;
            result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
          }
        }
      } else if (declType === 'TSTypeAliasDeclaration') {
        if (AstHelpers.getIdName(decl) === 'Type') {
          result.hasType = true;
          result.hasTypeFromSchema = SchemaMemberGuards.isTypeFromSchema(decl);
        }
      } else if (declType === 'FunctionDeclaration') {
        if (AstHelpers.getIdName(decl) === 'validate') {
          result.hasValidate = true;
          result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
        }
      }
    }

    return result;
  }
}

class ProgramExitListener {
  static create(context: Rule.RuleContext, expectedName: string): Rule.RuleListener['Program:exit'] {
    return (program) => {
      const body = Array.isArray(program.body) ? program.body : [];

      const namespaceExports = (body as unknown[]).filter((stmt) => {
        if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') { return false; }
        return AstHelpers.getNodeType(AstHelpers.getDeclaration(stmt)) === 'TSModuleDeclaration';
      });

      if (namespaceExports.length === 0) {
        context.report({ 'messageId': 'noNamespace', 'node': program });
        return;
      }

      for (const exportStmt of namespaceExports) {
        const decl = AstHelpers.getDeclaration(exportStmt);
        if (!TypeGuards.isJsonObject(decl)) { continue; }

        const nsName = AstHelpers.getIdName(decl);
        if (nsName !== expectedName) {
          context.report({
            'data': { 'expected': expectedName, 'found': nsName ?? '(unknown)' },
            'messageId': 'namespaceMismatch',
            'node': exportStmt as Rule.Node
          });
        }

        const members = NamespaceScanner.scanBody(decl.body);
        const reportNode = exportStmt as Rule.Node;

        if (!members.hasSchema) { context.report({ 'messageId': 'missingSchema', 'node': reportNode }); }
        else if (!members.hasSchemaAsConst) { context.report({ 'messageId': 'schemaNotConst', 'node': reportNode }); }
        if (!members.hasType) { context.report({ 'messageId': 'missingType', 'node': reportNode }); }
        else if (!members.hasTypeFromSchema) { context.report({ 'messageId': 'typeNotFromSchema', 'node': reportNode }); }
        if (!members.hasValidate) { context.report({ 'messageId': 'missingValidate', 'node': reportNode }); }
        else if (!members.hasValidateTypeGuard) { context.report({ 'messageId': 'validateNotTypeGuard', 'node': reportNode }); }
      }
    };
  }
}

export const entityNamespace: Rule.RuleModule = {
  'create': (context) => {
    const { filename } = context;

    if (filename === '<input>' || !PathGuards.isEntityFile(filename)) { return {}; }

    const expectedName = AstHelpers.getEntityBaseName(filename);

    return {
      'Program:exit': ProgramExitListener.create(context, expectedName)
    };
  },
  'meta': {
    'docs': {
      'description': 'Entity files must export a single namespace containing Schema (const), Type (from FromSchema), and validate (type guard).',
      'recommended': false
    },
    'messages': {
      'missingSchema': 'Entity namespace must export `const Schema` — a JSON Schema object literal declared `as const`.',
      'missingType': 'Entity namespace must export `type Type` derived via `FromSchema<typeof Schema>`.',
      'missingValidate': 'Entity namespace must export `validate` — either `const validate = SchemaValidator.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type`.',
      'namespaceMismatch': 'Namespace name `{{found}}` must match the filename base `{{expected}}`.',
      'noNamespace': 'Entity files must export exactly one namespace (e.g. `export namespace XxxEntity { ... }`).',
      'schemaNotConst': 'Entity `Schema` must be declared `as const` to preserve the literal type for `FromSchema<typeof Schema>`.',
      'typeNotFromSchema': 'Entity `type Type` must be derived as `FromSchema<typeof Schema>` — do not hand-write the type.',
      'validateNotTypeGuard': 'Entity `validate` must be a type guard: `const validate = SchemaValidator.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type { ... }`.'
    },
    'schema': [],
    'type': 'problem'
  }
};
