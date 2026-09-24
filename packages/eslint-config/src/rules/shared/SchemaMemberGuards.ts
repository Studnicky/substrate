import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from './astHelpers.js';

// Shared between `entity-file-shape`, which REQUIRES an entity namespace to expose a
// `validate` type guard, and `static-method-verbs`, which would otherwise report that same
// declaration as a freestanding module-scope function. Both rules must agree on exactly
// what the canonical shape is, so the predicate lives here and is imported by both rather
// than duplicated — a second copy is how the two drifted into contradiction before.

export class SchemaMemberGuards {
  static isConstTypeAnnotation(typeAnnotation: unknown): boolean {
    if (!Predicates.isRecord(typeAnnotation)) {
      return false;
    }
    // @typescript-eslint/parser represents `as const` as either:
    //   TSTypeOperator { operator: 'const' }  (some versions)
    //   TSTypeReference { typeName: { name: 'const' } }  (other versions / this runtime)
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeOperator') {
      const result = (typeAnnotation).operator === 'const';

      return result;
    }
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeReference') {
      const { typeName } = typeAnnotation;
      const result = Predicates.isRecord(typeName) && (typeName).name === 'const';

      return result;
    }

    return false;
  }

  // Value-first authoring: either a const-asserted object literal (`{ ... } as const`, optionally
  // `satisfies T`) or a schema-builder call (`Type.Object({...})`, `z.object({...})`). Either form
  // binds `Type = FromSchema<typeof Schema>` (or an equivalent deriving type) to a value the schema
  // itself owns, rather than to a hand-written type.
  static isSchemaValueAuthored(declarator: unknown): boolean {
    if (!Predicates.isRecord(declarator)) {
      return false;
    }
    const { init } = declarator;

    if (!Predicates.isRecord(init)) {
      return false;
    }
    const initType = AstHelpers.getNodeType(init);

    // Plain: `{ ... } as const`
    if (initType === 'TSAsExpression') {
      const result = SchemaMemberGuards.isConstTypeAnnotation(init.typeAnnotation);

      return result;
    }
    // `{ ... } as const satisfies T` — TypeScript processes as (literal as const) satisfies T
    // so the outer node is TSSatisfiesExpression wrapping a TSAsExpression
    if (initType === 'TSSatisfiesExpression') {
      const { expression } = init;

      if (!Predicates.isRecord(expression) || AstHelpers.getNodeType(expression) !== 'TSAsExpression') {
        return false;
      }

      const result = SchemaMemberGuards.isConstTypeAnnotation(expression.typeAnnotation);

      return result;
    }
    // Builder call: `Type.Object({...})`, `z.object({...})` — a schema library's own construction
    // function, whichever library it is, owns the value the same way an `as const` literal does.
    if (initType === 'CallExpression') {
      return true;
    }

    return false;
  }

  static isSchemaDerivedReference(typeAnnotation: unknown): boolean {
    if (!Predicates.isRecord(typeAnnotation) || AstHelpers.getNodeType(typeAnnotation) !== 'TSTypeReference') {
      return false;
    }
    if (!Predicates.isRecord(typeAnnotation.typeName)) {
      return false;
    }

    const parameters = SchemaMemberGuards.typeReferenceParameterList(typeAnnotation);

    if (parameters === undefined) {
      return false;
    }

    const result = SchemaMemberGuards.hasSchemaTypeQueryArgument(parameters);

    return result;
  }

  // The deriving type is whatever the package uses to turn a schema value into a type.
  // Its identity carries no weight; the `typeof Schema` argument is what binds the type to the value.
  private static typeReferenceParameterList(typeAnnotation: Record<string, unknown>): unknown[] | undefined {
    let typeParameters: Record<string, unknown> | undefined;

    if (Predicates.isRecord(typeAnnotation.typeParameters)) {
      typeParameters = typeAnnotation.typeParameters;
    } else if (Predicates.isRecord(typeAnnotation.typeArguments)) {
      typeParameters = typeAnnotation.typeArguments;
    }
    if (!Predicates.isRecord(typeParameters)) {
      return undefined;
    }
    const parameters: unknown = Reflect.get(typeParameters, 'params');

    if (!Array.isArray(parameters)) {
      return undefined;
    }

    return parameters;
  }

  private static hasSchemaTypeQueryArgument(parameters: readonly unknown[]): boolean {
    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index++) {
      const argument: unknown = parameters.at(index);

      if (!Predicates.isRecord(argument) || AstHelpers.getNodeType(argument) !== 'TSTypeQuery') {
        continue;
      }
      const { exprName } = argument;

      if (Predicates.isRecord(exprName) && exprName.name === 'Schema') {
        return true;
      }
    }

    return false;
  }

  // `interface Type extends FromSchema<typeof Schema, {...}> {}` — the only way to make `Type`
  // self-referential, since a type alias cannot reference its own name in its own type arguments.
  // A heritage clause (`TSInterfaceHeritage`) carries the deriving-type reference on `expression`/
  // `typeArguments` rather than `typeName`/`typeParameters`, so it is adapted to the same
  // `TSTypeReference` shape `isSchemaDerivedReference` already recognizes rather than duplicating
  // its `typeof Schema` argument scan.
  static isInterfaceSchemaDerived(declaration: unknown): boolean {
    if (!Predicates.isRecord(declaration)) {
      return false;
    }
    const heritageClauses: unknown = Reflect.get(declaration, 'extends');

    if (!Array.isArray(heritageClauses)) {
      return false;
    }

    const heritageLength = heritageClauses.length;

    for (let index = 0; index < heritageLength; index++) {
      const heritage: unknown = heritageClauses.at(index);

      if (!Predicates.isRecord(heritage)) {
        continue;
      }

      const adapted = {
        ...heritage,
        'type': 'TSTypeReference',
        'typeName': Reflect.get(heritage, 'expression')
      };

      if (SchemaMemberGuards.isSchemaDerivedReference(adapted)) {
        return true;
      }
    }

    return false;
  }

  static isTypeFromSchema(decl: unknown): boolean {
    if (!Predicates.isRecord(decl)) {
      return false;
    }
    const { typeAnnotation } = decl;

    if (!Predicates.isRecord(typeAnnotation)) {
      return false;
    }
    // Plain: `type Type = FromSchema<typeof Schema>`
    if (SchemaMemberGuards.isSchemaDerivedReference(typeAnnotation)) {
      return true;
    }
    // Intersection: `type Type = FromSchema<typeof Schema> & { ... }`
    // Accept when the first member of the intersection derives from the schema
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSIntersectionType') {
      const { types } = typeAnnotation;

      if (!Array.isArray(types) || types.length < 2) {
        return false;
      }

      const result = SchemaMemberGuards.isSchemaDerivedReference(types.at(0));

      return result;
    }

    return false;
  }

  // Recognises `EntityCompiler.compile<Type>(Schema)` — the schema-derived
  // validator form. The compiled entity validator is itself a
  // `(candidate: unknown) => candidate is Type` predicate, so a `const validate`
  // bound to it is a valid type guard with zero hand-written constraint logic.
  static isEntityCompilerCompile(init: unknown): boolean {
    if (!Predicates.isRecord(init) || AstHelpers.getNodeType(init) !== 'CallExpression') {
      return false;
    }

    if (!SchemaMemberGuards.isEntityCompilerCompileCallee(init.callee)) {
      return false;
    }

    const result = SchemaMemberGuards.hasSoleTypeArgument(init);

    return result;
  }

  private static isEntityCompilerCompileCallee(callee: unknown): boolean {
    if (!Predicates.isRecord(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
      return false;
    }
    const {
      object, property
    } = callee;

    if (!Predicates.isRecord(object) || (object).name !== 'EntityCompiler') {
      return false;
    }
    if (!Predicates.isRecord(property) || (property).name !== 'compile') {
      return false;
    }

    return true;
  }

  // Require an explicit `<Type>` argument so the guard narrows to the entity Type.
  private static hasSoleTypeArgument(init: Record<string, unknown>): boolean {
    let typeParameters: unknown = init.typeArguments;

    if (!Predicates.isRecord(typeParameters)) {
      typeParameters = init.typeParameters;
    }
    if (!Predicates.isRecord(typeParameters)) {
      return false;
    }
    const parameters: unknown = Reflect.get(typeParameters, 'params');

    if (!Array.isArray(parameters) || parameters.length !== 1) {
      return false;
    }
    const argument: unknown = parameters.at(0);

    if (!Predicates.isRecord(argument) || AstHelpers.getNodeType(argument) !== 'TSTypeReference') {
      return false;
    }
    const { typeName } = argument;
    const result = Predicates.isRecord(typeName) && (typeName).name === 'Type';

    return result;
  }

  static isValidateTypeGuard(decl: unknown): boolean {
    if (!Predicates.isRecord(decl)) {
      return false;
    }
    const declType = AstHelpers.getNodeType(decl);

    // `export const validate = EntityCompiler.compile<Type>(Schema)` — the
    // schema-as-source-of-truth form. No explicit predicate annotation needed.
    if (declType === 'VariableDeclaration' && SchemaMemberGuards.declaresEntityCompilerCompile(decl)) {
      return true;
    }

    const signature = SchemaMemberGuards.validatorSignature(declType, decl);

    if (signature === undefined) {
      return false;
    }

    const predicate = SchemaMemberGuards.typePredicateNode(signature.returnType);

    if (predicate === undefined) {
      return false;
    }

    if (!SchemaMemberGuards.predicateParameterNameMatches(predicate, signature.firstParamName)) {
      return false;
    }

    const result = SchemaMemberGuards.predicateReferencesType(predicate);

    return result;
  }

  private static declaresEntityCompilerCompile(decl: Record<string, unknown>): boolean {
    const { declarations } = decl;
    const firstDeclarator: unknown = Array.isArray(declarations) ? declarations.at(0) : undefined;

    const result = Predicates.isRecord(firstDeclarator) && SchemaMemberGuards.isEntityCompilerCompile(firstDeclarator.init);

    return result;
  }

  private static validatorSignature(
    declType: string | undefined,
    decl: Record<string, unknown>
  ): Readonly<{ 'firstParamName': string | undefined; 'returnType': unknown }> | undefined {
    if (declType === 'FunctionDeclaration') {
      const returnType = decl.returnType;
      const firstParamName = SchemaMemberGuards.firstParameterName(Reflect.get(decl, 'params'));

      return { 'firstParamName': firstParamName, 'returnType': returnType };
    }

    if (declType === 'VariableDeclaration') {
      const result = SchemaMemberGuards.arrowOrFunctionExpressionSignature(decl);

      return result;
    }

    return undefined;
  }

  private static firstParameterName(parameters: unknown): string | undefined {
    const p: unknown = Array.isArray(parameters) ? parameters.at(0) : undefined;

    if (!Predicates.isRecord(p)) {
      return undefined;
    }

    if (Predicates.isRecord(p.name)) {
      return (p.name).name as string | undefined;
    }

    return p.name as string | undefined;
  }

  // const validate = (...): candidate is Type => { ... }
  private static arrowOrFunctionExpressionSignature(
    decl: Record<string, unknown>
  ): Readonly<{ 'firstParamName': string | undefined; 'returnType': unknown }> | undefined {
    const { declarations } = decl;

    if (!Array.isArray(declarations) || declarations.length === 0) {
      return undefined;
    }
    const declarator: unknown = declarations.at(0);

    if (!Predicates.isRecord(declarator)) {
      return undefined;
    }
    const { init } = declarator;

    if (!Predicates.isRecord(init)) {
      return undefined;
    }
    const initType = AstHelpers.getNodeType(init);

    // ArrowFunctionExpression or FunctionExpression
    if (initType !== 'ArrowFunctionExpression' && initType !== 'FunctionExpression') {
      return undefined;
    }

    const returnType = init.returnType;
    const firstParamName = SchemaMemberGuards.firstParameterName(Reflect.get(init, 'params'));

    return { 'firstParamName': firstParamName, 'returnType': returnType };
  }

  // returnType may be wrapped in a TSTypeAnnotation node
  private static typePredicateNode(returnType: unknown): Record<string, unknown> | undefined {
    let predicateNode: unknown = returnType;

    if (Predicates.isRecord(predicateNode) && AstHelpers.getNodeType(predicateNode) === 'TSTypeAnnotation') {
      predicateNode = (predicateNode).typeAnnotation;
    }
    if (!Predicates.isRecord(predicateNode) || AstHelpers.getNodeType(predicateNode) !== 'TSTypePredicate') {
      return undefined;
    }

    return predicateNode;
  }

  // parameterName must match firstParamName
  private static predicateParameterNameMatches(predicate: Record<string, unknown>, firstParamName: string | undefined): boolean {
    if (!Predicates.isRecord(predicate.parameterName)) {
      return false;
    }

    const pName = (predicate.parameterName).name;
    const result = pName === firstParamName;

    return result;
  }

  // typeAnnotation of predicate must reference Type
  private static predicateReferencesType(predicate: Record<string, unknown>): boolean {
    const predTypeAnnotation = predicate.typeAnnotation;

    if (!Predicates.isRecord(predTypeAnnotation)) {
      return false;
    }
    // May be wrapped in TSTypeAnnotation
    let typeReferenceNode: unknown = predTypeAnnotation;

    if (AstHelpers.getNodeType(typeReferenceNode) === 'TSTypeAnnotation') {
      typeReferenceNode = (typeReferenceNode as Record<string, unknown>).typeAnnotation;
    }
    if (!Predicates.isRecord(typeReferenceNode) || AstHelpers.getNodeType(typeReferenceNode) !== 'TSTypeReference') {
      return false;
    }
    const { typeName } = typeReferenceNode;

    if (!Predicates.isRecord(typeName)) {
      return false;
    }

    const result = (typeName).name === 'Type';

    return result;
  }
}
