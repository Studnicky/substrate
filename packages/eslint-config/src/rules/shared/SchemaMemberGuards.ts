import { AstHelpers } from './astHelpers.js';
import { ObjectGuard } from './ObjectGuard.js';

// Shared between `folder-content-shape`, which REQUIRES an entity namespace to expose a
// `validate` type guard, and `static-method-verbs`, which would otherwise report that same
// declaration as a freestanding module-scope function. Both rules must agree on exactly
// what the canonical shape is, so the predicate lives here and is imported by both rather
// than duplicated — a second copy is how the two drifted into contradiction before.

export class SchemaMemberGuards {
  static isConstTypeAnnotation(typeAnnotation: unknown): boolean {
    if (!ObjectGuard.isObject(typeAnnotation)) {
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
      const result = ObjectGuard.isObject(typeName) && (typeName).name === 'const';

      return result;
    }

    return false;
  }

  // Value-first authoring: either a const-asserted object literal (`{ ... } as const`, optionally
  // `satisfies T`) or a schema-builder call (`Type.Object({...})`, `z.object({...})`). Either form
  // binds `Type = FromSchema<typeof Schema>` (or an equivalent deriving type) to a value the schema
  // itself owns, rather than to a hand-written type.
  static isSchemaValueAuthored(declarator: unknown): boolean {
    if (!ObjectGuard.isObject(declarator)) {
      return false;
    }
    const { init } = declarator;

    if (!ObjectGuard.isObject(init)) {
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

      if (!ObjectGuard.isObject(expression) || AstHelpers.getNodeType(expression) !== 'TSAsExpression') {
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
    if (!ObjectGuard.isObject(typeAnnotation) || AstHelpers.getNodeType(typeAnnotation) !== 'TSTypeReference') {
      return false;
    }
    if (!ObjectGuard.isObject(typeAnnotation.typeName)) {
      return false;
    }
    // The deriving type is whatever the package uses to turn a schema value into a type.
    // Its identity carries no weight; the `typeof Schema` argument is what binds the type to the value.
    let typeParameters: Record<string, unknown> | undefined;

    if (ObjectGuard.isObject(typeAnnotation.typeParameters)) {
      typeParameters = typeAnnotation.typeParameters;
    } else if (ObjectGuard.isObject(typeAnnotation.typeArguments)) {
      typeParameters = typeAnnotation.typeArguments;
    }
    if (!ObjectGuard.isObject(typeParameters)) {
      return false;
    }
    const parameters: unknown = Reflect.get(typeParameters, 'params');

    if (!Array.isArray(parameters)) {
      return false;
    }

    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index++) {
      const argument: unknown = parameters.at(index);

      if (!ObjectGuard.isObject(argument) || AstHelpers.getNodeType(argument) !== 'TSTypeQuery') {
        continue;
      }
      const { exprName } = argument;

      if (ObjectGuard.isObject(exprName) && exprName.name === 'Schema') {
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
    if (!ObjectGuard.isObject(declaration)) {
      return false;
    }
    const heritageClauses: unknown = Reflect.get(declaration, 'extends');

    if (!Array.isArray(heritageClauses)) {
      return false;
    }

    const heritageLength = heritageClauses.length;

    for (let index = 0; index < heritageLength; index++) {
      const heritage: unknown = heritageClauses.at(index);

      if (!ObjectGuard.isObject(heritage)) {
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
    if (!ObjectGuard.isObject(decl)) {
      return false;
    }
    const { typeAnnotation } = decl;

    if (!ObjectGuard.isObject(typeAnnotation)) {
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

  // Recognises `SchemaValidator.compile<Type>(Schema)` — the schema-derived
  // validator form. The compiled Ajv `ValidateFunction<Type>` is itself a
  // `(candidate: unknown) => candidate is Type` predicate, so a `const validate`
  // bound to it is a valid type guard with zero hand-written constraint logic.
  static isSchemaValidatorCompile(init: unknown): boolean {
    if (!ObjectGuard.isObject(init) || AstHelpers.getNodeType(init) !== 'CallExpression') {
      return false;
    }
    const { callee } = init;

    if (!ObjectGuard.isObject(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') {
      return false;
    }
    const {
      object, property
    } = callee;

    if (!ObjectGuard.isObject(object) || (object).name !== 'SchemaValidator') {
      return false;
    }
    if (!ObjectGuard.isObject(property) || (property).name !== 'compile') {
      return false;
    }
    // Require an explicit `<Type>` argument so the guard narrows to the entity Type.
    let typeParameters: unknown = init.typeArguments;

    if (!ObjectGuard.isObject(typeParameters)) {
      typeParameters = init.typeParameters;
    }
    if (!ObjectGuard.isObject(typeParameters)) {
      return false;
    }
    const parameters: unknown = Reflect.get(typeParameters, 'params');

    if (!Array.isArray(parameters) || parameters.length !== 1) {
      return false;
    }
    const argument: unknown = parameters.at(0);

    if (!ObjectGuard.isObject(argument) || AstHelpers.getNodeType(argument) !== 'TSTypeReference') {
      return false;
    }
    const { typeName } = argument;
    const result = ObjectGuard.isObject(typeName) && (typeName).name === 'Type';

    return result;
  }

  static isValidateTypeGuard(decl: unknown): boolean {
    if (!ObjectGuard.isObject(decl)) {
      return false;
    }
    const declType = AstHelpers.getNodeType(decl);

    // `export const validate = SchemaValidator.compile<Type>(Schema)` — the
    // schema-as-source-of-truth form. No explicit predicate annotation needed.
    if (declType === 'VariableDeclaration') {
      const { declarations } = decl;
      const firstDeclarator: unknown = Array.isArray(declarations) ? declarations.at(0) : undefined;

      if (ObjectGuard.isObject(firstDeclarator)) {
        if (SchemaMemberGuards.isSchemaValidatorCompile(firstDeclarator.init)) {
          return true;
        }
      }
    }

    let returnType: unknown;
    let firstParamName: string | undefined;

    if (declType === 'FunctionDeclaration') {
      returnType = decl.returnType;
      const parameters: unknown = Reflect.get(decl, 'params');
      const p: unknown = Array.isArray(parameters) ? parameters.at(0) : undefined;

      if (ObjectGuard.isObject(p)) {
        if (ObjectGuard.isObject(p.name)) {
          firstParamName = (p.name).name as string | undefined;
        } else {
          firstParamName = p.name as string | undefined;
        }
      }
    } else if (declType === 'VariableDeclaration') {
      // const validate = (...): candidate is Type => { ... }
      const { declarations } = decl;

      if (!Array.isArray(declarations) || declarations.length === 0) {
        return false;
      }
      const declarator: unknown = declarations.at(0);

      if (!ObjectGuard.isObject(declarator)) {
        return false;
      }
      const { init } = declarator;

      if (!ObjectGuard.isObject(init)) {
        return false;
      }
      const initType = AstHelpers.getNodeType(init);

      // ArrowFunctionExpression or FunctionExpression
      if (initType !== 'ArrowFunctionExpression' && initType !== 'FunctionExpression') {
        return false;
      }
      returnType = init.returnType;
      const parameters: unknown = Reflect.get(init, 'params');
      const p: unknown = Array.isArray(parameters) ? parameters.at(0) : undefined;

      if (ObjectGuard.isObject(p)) {
        if (ObjectGuard.isObject(p.name)) {
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

    if (ObjectGuard.isObject(predicateNode) && AstHelpers.getNodeType(predicateNode) === 'TSTypeAnnotation') {
      predicateNode = (predicateNode).typeAnnotation;
    }
    if (!ObjectGuard.isObject(predicateNode) || AstHelpers.getNodeType(predicateNode) !== 'TSTypePredicate') {
      return false;
    }
    const predicate = predicateNode;

    // parameterName must match firstParamName
    if (ObjectGuard.isObject(predicate.parameterName)) {
      const pName = (predicate.parameterName).name;

      if (pName !== firstParamName) {
        return false;
      }
    } else {
      return false;
    }

    // typeAnnotation of predicate must reference Type
    const predTypeAnnotation = predicate.typeAnnotation;

    if (!ObjectGuard.isObject(predTypeAnnotation)) {
      return false;
    }
    // May be wrapped in TSTypeAnnotation
    let typeReferenceNode: unknown = predTypeAnnotation;

    if (AstHelpers.getNodeType(typeReferenceNode) === 'TSTypeAnnotation') {
      typeReferenceNode = (typeReferenceNode as Record<string, unknown>).typeAnnotation;
    }
    if (!ObjectGuard.isObject(typeReferenceNode) || AstHelpers.getNodeType(typeReferenceNode) !== 'TSTypeReference') {
      return false;
    }
    const { typeName } = typeReferenceNode;

    if (!ObjectGuard.isObject(typeName)) {
      return false;
    }

    const result = (typeName).name === 'Type';

    return result;
  }
}
