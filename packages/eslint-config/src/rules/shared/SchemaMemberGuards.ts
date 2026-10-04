import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from './astHelpers.js';
import { ACCEPTED_SCHEMA_VALUE_NAMES, DISCRIMINANT_DEFEATING_SCHEMA_KEYS } from './constants/SchemaDerivationConstants.js';

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

      if (Predicates.isRecord(exprName) && typeof exprName.name === 'string' && ACCEPTED_SCHEMA_VALUE_NAMES.has(exprName.name)) {
        return true;
      }
    }

    return false;
  }

  // True when a deriving-type reference carries a schema-owning `typeof` argument AND at least
  // one further argument — `json-schema-to-ts`'s `deserialize` override slot, which REPLACES the
  // structurally-derived type with a hand-written one. A single clean `typeof Schema`/`typeof
  // Node` argument has nothing to override; only the presence of a second argument alongside it
  // is suspect.
  private static parametersHaveOverride(parameters: readonly unknown[]): boolean {
    const result = parameters.length > 1 && SchemaMemberGuards.hasSchemaTypeQueryArgument(parameters);

    return result;
  }

  static derivedTypeHasOverride(decl: unknown): boolean {
    if (!Predicates.isRecord(decl)) {
      return false;
    }
    const { typeAnnotation } = decl;

    if (!Predicates.isRecord(typeAnnotation)) {
      return false;
    }

    const result = SchemaMemberGuards.typeAnnotationHasOverride(typeAnnotation);

    return result;
  }

  private static typeAnnotationHasOverride(typeAnnotation: Record<string, unknown>): boolean {
    const nodeType = AstHelpers.getNodeType(typeAnnotation);

    if (nodeType === 'TSTypeReference') {
      const parameters = SchemaMemberGuards.typeReferenceParameterList(typeAnnotation);
      const result = parameters !== undefined && SchemaMemberGuards.parametersHaveOverride(parameters);

      return result;
    }
    if (nodeType === 'TSIntersectionType') {
      const { types } = typeAnnotation;
      const first: unknown = Array.isArray(types) ? types.at(0) : undefined;
      const result = Predicates.isRecord(first) && SchemaMemberGuards.typeAnnotationHasOverride(first);

      return result;
    }

    return false;
  }

  // Interface-heritage counterpart to `derivedTypeHasOverride` — same override-slot check,
  // adapted to the heritage-clause shape `isInterfaceSchemaDerived` already adapts.
  static interfaceDerivedTypeHasOverride(declaration: unknown): boolean {
    if (!Predicates.isRecord(declaration)) {
      return false;
    }
    const heritageClauses: unknown = Reflect.get(declaration, 'extends');

    if (!Array.isArray(heritageClauses)) {
      return false;
    }

    const result = heritageClauses.some(SchemaMemberGuards.heritageHasOverride);

    return result;
  }

  private static heritageHasOverride(heritage: unknown): boolean {
    if (!Predicates.isRecord(heritage)) {
      return false;
    }
    const adapted: Record<string, unknown> = {
      ...heritage,
      'type': 'TSTypeReference',
      'typeName': Reflect.get(heritage, 'expression')
    };
    const result = SchemaMemberGuards.typeAnnotationHasOverride(adapted);

    return result;
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

    const name = Predicates.isRecord(p.name) ? p.name.name : p.name;
    const result = typeof name === 'string' ? name : undefined;

    return result;
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
      typeReferenceNode = AstHelpers.getNodeProperty(typeReferenceNode, 'typeAnnotation');
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

  // Walks the `Schema` declarator's own literal value for a `not`/`if`/`then`/`else` key at any
  // depth — the only proof, from the schema itself, that no structural derivation exists.
  static schemaDefeatsStructuralDerivation(declarator: unknown): boolean {
    if (!Predicates.isRecord(declarator)) {
      return false;
    }

    const literal = SchemaMemberGuards.unwrapToObjectLiteral(declarator.init);
    const result = literal !== undefined && SchemaMemberGuards.containsDiscriminantDefeatingKey(literal);

    return result;
  }

  private static unwrapToObjectLiteral(node: unknown): Record<string, unknown> | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'TSAsExpression' || nodeType === 'TSSatisfiesExpression') {
      const result = SchemaMemberGuards.unwrapToObjectLiteral(node.expression);

      return result;
    }
    if (nodeType === 'ObjectExpression') {
      return node;
    }

    return undefined;
  }

  private static containsDiscriminantDefeatingKey(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'ObjectExpression') {
      const properties = Array.isArray(node.properties) ? node.properties : [];

      // An empty schema (`{}`) has no constraining keyword at all — it matches any value,
      // the same unprovable-otherwise shape `not`/`if`/`then`/`else` are.
      if (properties.length === 0) {
        return true;
      }
      if (SchemaMemberGuards.isAnyOfRefinement(properties)) {
        return true;
      }

      const result = properties.some(SchemaMemberGuards.propertyDefeatsDerivation);

      return result;
    }
    if (nodeType === 'ArrayExpression') {
      const elements = Array.isArray(node.elements) ? node.elements : [];
      const result = elements.some(SchemaMemberGuards.containsDiscriminantDefeatingKey);

      return result;
    }

    return false;
  }

  // `anyOf` co-occurring with `properties`/`required` in the SAME object is a refinement on an
  // independently-declared base shape — a conditional discriminant, not a plain union. `anyOf`
  // alone (no sibling base-shape keyword) is an ordinary union and derives structurally fine;
  // only the refinement form is unprovable otherwise.
  private static isAnyOfRefinement(properties: readonly unknown[]): boolean {
    const keyNames = new Set(properties.map((property) => {
      const record = Predicates.isRecord(property) ? property : undefined;
      const result = record === undefined ? undefined : SchemaMemberGuards.staticKeyName(record.key);

      return result;
    }));

    const result = keyNames.has('anyOf') && (keyNames.has('properties') || keyNames.has('required'));

    return result;
  }

  private static propertyDefeatsDerivation(property: unknown): boolean {
    if (!Predicates.isRecord(property)) {
      return false;
    }

    const keyName = SchemaMemberGuards.staticKeyName(property.key);

    if (keyName !== undefined && DISCRIMINANT_DEFEATING_SCHEMA_KEYS.has(keyName)) {
      return true;
    }

    const result = SchemaMemberGuards.containsDiscriminantDefeatingKey(property.value);

    return result;
  }

  // True when the `Schema` declarator's literal composes another file's schema — a spread of an
  // identifier, or a property whose value is a member reference — rather than declaring the
  // whole shape inline. The walk cannot see across that reference, so it can prove neither
  // presence nor absence of a defeating keyword on the far side.
  static schemaComposesExternalReference(declarator: unknown): boolean {
    if (!Predicates.isRecord(declarator)) {
      return false;
    }

    const literal = SchemaMemberGuards.unwrapToObjectLiteral(declarator.init);
    const result = literal !== undefined && SchemaMemberGuards.containsExternalReference(literal);

    return result;
  }

  private static containsExternalReference(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'ObjectExpression') {
      const properties = Array.isArray(node.properties) ? node.properties : [];
      const result = properties.some(SchemaMemberGuards.propertyReferencesExternalSchema);

      return result;
    }
    if (nodeType === 'ArrayExpression') {
      const elements = Array.isArray(node.elements) ? node.elements : [];
      const result = elements.some(SchemaMemberGuards.containsExternalReference);

      return result;
    }

    return false;
  }

  private static propertyReferencesExternalSchema(property: unknown): boolean {
    if (!Predicates.isRecord(property)) {
      return false;
    }
    const propertyType = AstHelpers.getNodeType(property);

    if (propertyType === 'SpreadElement') {
      const result = Predicates.isRecord(property.argument) && AstHelpers.getNodeType(property.argument) === 'Identifier';

      return result;
    }
    if (AstHelpers.getNodeType(property.value) === 'MemberExpression') {
      return true;
    }

    const result = SchemaMemberGuards.containsExternalReference(property.value);

    return result;
  }

  // True when `Type` bottoms out in a `SomeOtherEntity.Type` reference — composing a shape
  // another file already had to justify — rather than declaring one inline. Unwraps an array,
  // a `readonly` operator, and a union of such forms; a bare inline object or a non-entity
  // imported alias does not qualify.
  static typeIsComposedFromEntityType(decl: unknown): boolean {
    if (!Predicates.isRecord(decl)) {
      return false;
    }

    const result = SchemaMemberGuards.typeNodeIsEntityTypeComposition(decl.typeAnnotation);

    return result;
  }

  private static typeNodeIsEntityTypeComposition(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'TSArrayType') {
      const result = SchemaMemberGuards.typeNodeIsEntityTypeComposition(node.elementType);

      return result;
    }
    if (nodeType === 'TSTypeOperator' && node.operator === 'readonly') {
      const result = SchemaMemberGuards.typeNodeIsEntityTypeComposition(node.typeAnnotation);

      return result;
    }
    if (nodeType === 'TSUnionType') {
      const members = Array.isArray(node.types) ? node.types : [];
      const result = members.length > 0 && members.every(SchemaMemberGuards.typeNodeIsEntityTypeComposition);

      return result;
    }
    if (nodeType === 'TSTypeReference') {
      const result = SchemaMemberGuards.isQualifiedEntityTypeName(node.typeName);

      return result;
    }

    return false;
  }

  private static isQualifiedEntityTypeName(typeName: unknown): boolean {
    if (!Predicates.isRecord(typeName) || AstHelpers.getNodeType(typeName) !== 'TSQualifiedName') {
      return false;
    }
    const right = typeName.right;
    const result = Predicates.isRecord(right) && AstHelpers.getNodeType(right) === 'Identifier' && right.name === 'Type';

    return result;
  }

  // The single entry point every rule that classifies a hand-written entity `Type` consults —
  // entity-file-shape calls it directly on the raw AST; type-alias-invariants and
  // all-types-are-entities call it on the same raw AST node obtained from
  // `context.sourceCode`/the ESLint listener, never through a second, type-aware
  // reimplementation of this judgment. A hand-written `Type` is justified when its own
  // namespace's Schema/Node proves no structural derivation exists, or — when that schema
  // composes another file's schema this walk cannot see into — when `Type` itself composes
  // that other file's already-justified `.Type`.
  static isJustifiedHandWrittenEntityType(declaration: unknown): boolean {
    const schemaDeclarator = SchemaMemberGuards.namespaceSchemaDeclarator(declaration);

    if (schemaDeclarator === undefined) {
      return false;
    }
    if (SchemaMemberGuards.schemaDefeatsStructuralDerivation(schemaDeclarator)) {
      return true;
    }

    const result = SchemaMemberGuards.schemaComposesExternalReference(schemaDeclarator)
      && SchemaMemberGuards.typeIsComposedFromEntityType(declaration);

    return result;
  }

  // Resolves the exported `Schema`/`Node` declarator in the same `*Entity` namespace as an
  // exported `Type` alias — `undefined` for anything that is not that exact shape.
  private static namespaceSchemaDeclarator(declaration: unknown): unknown {
    if (!Predicates.isRecord(declaration) || AstHelpers.getIdentifierName(declaration.id) !== 'Type') {
      return undefined;
    }

    const namespaceBlock = SchemaMemberGuards.entityNamespaceBlock(declaration);

    if (namespaceBlock === undefined) {
      return undefined;
    }

    const result = SchemaMemberGuards.findSchemaDeclarator(namespaceBlock);

    return result;
  }

  private static entityNamespaceBlock(declaration: Record<string, unknown>): Record<string, unknown> | undefined {
    const exportDeclaration = declaration.parent;

    if (!Predicates.isRecord(exportDeclaration) || AstHelpers.getNodeType(exportDeclaration) !== 'ExportNamedDeclaration') {
      return undefined;
    }

    const namespaceBlock = exportDeclaration.parent;

    if (!Predicates.isRecord(namespaceBlock) || AstHelpers.getNodeType(namespaceBlock) !== 'TSModuleBlock') {
      return undefined;
    }

    const namespaceName = SchemaMemberGuards.moduleDeclarationName(namespaceBlock.parent);

    if (namespaceName?.endsWith('Entity') !== true) {
      return undefined;
    }

    return namespaceBlock;
  }

  private static moduleDeclarationName(namespaceDeclaration: unknown): string | undefined {
    const result = Predicates.isRecord(namespaceDeclaration) ? AstHelpers.getIdentifierName(namespaceDeclaration.id) : undefined;

    return result;
  }

  private static findSchemaDeclarator(namespaceBlock: Record<string, unknown>): unknown {
    const body: unknown[] = Array.isArray(namespaceBlock.body) ? namespaceBlock.body : [];
    const bodyLength = body.length;

    for (let index = 0; index < bodyLength; index += 1) {
      const declaration = SchemaMemberGuards.unwrapExportedDeclaration(body.at(index));

      if (!Predicates.isRecord(declaration) || AstHelpers.getNodeType(declaration) !== 'VariableDeclaration') {
        continue;
      }

      const declarators: unknown[] = Array.isArray(declaration.declarations) ? declaration.declarations : [];
      const schemaDeclarator = declarators.find(SchemaMemberGuards.isSchemaValueDeclarator);

      if (schemaDeclarator !== undefined) {
        return schemaDeclarator;
      }
    }

    return undefined;
  }

  private static isSchemaValueDeclarator(declarator: unknown): boolean {
    const name = Predicates.isRecord(declarator) ? AstHelpers.getIdentifierName(declarator.id) : undefined;
    const result = name !== undefined && ACCEPTED_SCHEMA_VALUE_NAMES.has(name);

    return result;
  }

  private static unwrapExportedDeclaration(statement: unknown): unknown {
    if (!Predicates.isRecord(statement) || AstHelpers.getNodeType(statement) !== 'ExportNamedDeclaration') {
      return undefined;
    }

    return statement.declaration;
  }

  private static staticKeyName(key: unknown): string | undefined {
    if (!Predicates.isRecord(key)) {
      return undefined;
    }
    const keyType = AstHelpers.getNodeType(key);

    if (keyType === 'Identifier' && typeof key.name === 'string') {
      return key.name;
    }
    if (keyType === 'Literal' && typeof key.value === 'string') {
      return key.value;
    }

    return undefined;
  }
}
