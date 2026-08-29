import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type * as TypeScript from 'typescript';

import { SchemaValidator } from '@studnicky/json';
import { Predicates } from '@studnicky/types';
import { isTypeNode, type Node, type Program, TypeFlags } from 'typescript';

import type { LayerBindingEntity } from '../layers/LayerBindingEntity.js';

import { LayerResolver } from '../layers/LayerResolver.js';
import { ResolutionSiteEntity } from './ResolutionSiteEntity.js';

// The rule asks one binary question of a file: may it resolve a token? That is a property of
// the file, not a position in some other axis the project already defines. Binding it to a
// layer NAME out of a shared `layers` list couples this rule to whatever that list happens to
// encode -- in a project whose bands measure dependency depth, no layer name carries
// "resolves external input" at all, and there is no string that would make one.
namespace NoThreadedVocabularyOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'resolutionSites': {
        'default': [],
        'description': 'Matchers for the files permitted to receive a closed-vocabulary token and resolve it into an implementation -- the composition roots. Same matcher vocabulary as layer bindings (folder/package/module/dependency/builtin) minus the layer name. Every file not matching one of these is checked. The default, an empty list, exempts nothing.',
        'items': ResolutionSiteEntity.Schema,
        'type': 'array'
      },
      'sourceRoot': {
        'description': 'Path segment(s) after which a resolution site\'s candidate segment appears, e.g. "src" or "packages".',
        'type': 'string'
      }
    },
    'required': ['sourceRoot'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

const RESOLUTION_SITE_LAYER = 'resolutionSite';

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!Predicates.isRecord(program) || !Predicates.isRecord(nodeMap)) { return false; }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
    return result;
  }
}

/** Resolves a `TSTypeReference` node down to the bare name it references. */
class TypeReferenceName {
  public static get(typeNode: Record<string, unknown>): string | undefined {
    const typeName: unknown = typeNode.typeName;
    if (!Predicates.isRecord(typeName)) { return undefined; }

    if (typeName.type === 'Identifier') {
      const name = typeName.name;
      const result = typeof name === 'string' ? name : undefined;
      return result;
    }

    if (typeName.type === 'TSQualifiedName') {
      const left = TypeReferenceName.get({ 'typeName': typeName.left });
      const right: unknown = typeName.right;
      if (left === undefined || !Predicates.isRecord(right)) { return undefined; }

      const name = right.name;
      const result = typeof name === 'string' ? `${left}.${name}` : undefined;
      return result;
    }

    return undefined;
  }
}

/**
 * Same-file index of enum declarations and type aliases, so `mode: TransportMode`
 * resolves without type information when the vocabulary is declared alongside its use.
 * Cross-file references need the typed path.
 */
class LocalVocabularyIndex {
  public readonly 'aliases': ReadonlyMap<string, unknown>;
  public readonly 'enums': ReadonlySet<string>;

  private constructor(enums: ReadonlySet<string>, aliases: ReadonlyMap<string, unknown>) {
    this.enums = enums;
    this.aliases = aliases;
  }

  public static build(body: unknown): LocalVocabularyIndex {
    const enums = new Set<string>();
    const aliases = new Map<string, unknown>();
    const bareCounts = new Map<string, number>();

    LocalVocabularyIndex.#collect(body, '', enums, aliases, bareCounts);

    // A namespace member is indexed by its qualified name so `Domain.Mode` cannot
    // resolve to an unrelated `Transport.Mode`. The bare name is added only when
    // exactly one declaration in the file claims it, which keeps intra-namespace
    // references working without reintroducing the collision.
    const qualifiedEnums = [...enums];
    for (let index = 0; index < qualifiedEnums.length; index += 1) {
      const qualified = qualifiedEnums.at(index) ?? '';
      const bare = LocalVocabularyIndex.#bareNameOf(qualified);
      if (bare !== qualified && bareCounts.get(bare) === 1) { enums.add(bare); }
    }

    const qualifiedAliases = [...aliases.keys()];
    for (let index = 0; index < qualifiedAliases.length; index += 1) {
      const qualified = qualifiedAliases.at(index) ?? '';
      const bare = LocalVocabularyIndex.#bareNameOf(qualified);
      if (bare !== qualified && bareCounts.get(bare) === 1) { aliases.set(bare, aliases.get(qualified)); }
    }

    const built = new LocalVocabularyIndex(enums, aliases);
    return built;
  }

  static #bareNameOf(qualified: string): string {
    const segments = qualified.split('.');
    const result = segments.at(segments.length - 1) ?? qualified;
    return result;
  }

  static #collect(
    body: unknown,
    prefix: string,
    enums: Set<string>,
    aliases: Map<string, unknown>,
    bareCounts: Map<string, number>
  ): void {
    if (!Predicates.isArray(body)) { return; }

    for (let index = 0; index < body.length; index += 1) {
      const declaration = LocalVocabularyIndex.#unwrapExport(body.at(index));
      if (!Predicates.isRecord(declaration)) { continue; }

      const identifier: unknown = declaration.id;
      if (!Predicates.isRecord(identifier)) { continue; }

      // `declare module 'pkg'` augments a third-party surface rather than declaring
      // a frame in this architecture, so its contents are not indexed or reported.
      if (declaration.type === 'TSModuleDeclaration') {
        if (identifier.type !== 'Identifier' || typeof identifier.name !== 'string') { continue; }
        LocalVocabularyIndex.#collect(
          LocalVocabularyIndex.#moduleBody(declaration),
          `${prefix}${identifier.name}.`,
          enums,
          aliases,
          bareCounts
        );
        continue;
      }

      if (typeof identifier.name !== 'string') { continue; }

      const bare = identifier.name;
      const isVocabularyDeclaration = declaration.type === 'TSEnumDeclaration' || declaration.type === 'TSTypeAliasDeclaration';
      const isNameHolder = isVocabularyDeclaration || declaration.type === 'TSInterfaceDeclaration' || declaration.type === 'ClassDeclaration';

      if (isNameHolder) { bareCounts.set(bare, (bareCounts.get(bare) ?? 0) + 1); }
      if (!isVocabularyDeclaration) { continue; }

      if (declaration.type === 'TSEnumDeclaration') {
        enums.add(`${prefix}${bare}`);
        continue;
      }
      aliases.set(`${prefix}${bare}`, declaration.typeAnnotation);
    }
  }

  static #unwrapExport(statement: unknown): unknown {
    if (!Predicates.isRecord(statement)) { return statement; }
    if (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') {
      const inner = LocalVocabularyIndex.#unwrapExport(statement.declaration);
      return inner;
    }
    return statement;
  }

  // A vocabulary declared inside `namespace X { export enum Mode {} }` is referenced as
  // `X.Mode`, which resolves to the same bare name, so the namespace body is indexed flat.
  static #moduleBody(declaration: Record<string, unknown>): unknown {
    const body: unknown = declaration.body;
    if (!Predicates.isRecord(body)) { return undefined; }
    return body.body;
  }
}

/** Reads a TypeScript type and reports whether it is a closed set of literal members. */
class ClosedVocabularyType {
  public static matches(type: TypeScript.Type): boolean {
    if (!type.isUnion()) { return false; }

    const meaningful = type.types.filter((member) => {
      const result = !ClosedVocabularyType.#isNullish(member);
      return result;
    });

    // One inhabitant encodes no choice, so nothing decided elsewhere is being carried.
    // `encoding: 'utf8'` narrows a parameter; it does not select an implementation.
    if (meaningful.length < 2) { return false; }

    const result = meaningful.every((member) => {
      const memberResult = ClosedVocabularyType.#isLiteral(member);
      return memberResult;
    });
    return result;
  }

  static #isLiteral(type: TypeScript.Type): boolean {
    const literalFlags = TypeFlags.StringLiteral | TypeFlags.NumberLiteral | TypeFlags.BooleanLiteral | TypeFlags.EnumLiteral;
    const result = (type.flags & literalFlags) !== 0;
    return result;
  }

  static #isNullish(type: TypeScript.Type): boolean {
    const result = (type.flags & (TypeFlags.Undefined | TypeFlags.Null)) !== 0;
    return result;
  }
}

/**
 * Classifies a type annotation as a closed vocabulary: `boolean`, a literal type, or a
 * union of those. Nullish members are stripped first so `boolean | undefined` and
 * `'cli' | 'mcp' | undefined` classify the same as their non-optional forms.
 */
class VocabularyAnnotation {
  readonly #index: LocalVocabularyIndex;
  readonly #services: ParserServicesInterface | undefined;

  public constructor(index: LocalVocabularyIndex, services: ParserServicesInterface | undefined) {
    this.#index = index;
    this.#services = services;
  }

  public matches(typeNode: unknown, constraints: ReadonlyMap<string, unknown>): boolean {
    const result = this.#matches(typeNode, new Set<string>(), constraints);
    return result;
  }

  #matches(typeNode: unknown, seen: Set<string>, constraints: ReadonlyMap<string, unknown>): boolean {
    if (!Predicates.isRecord(typeNode)) { return false; }
    if (this.#matchesSyntactic(typeNode, seen, constraints)) { return true; }

    // Anything the syntactic walk could not settle — a cross-file enum, a generic alias
    // instantiation, `keyof`, indexed access, `typeof`, `import(...)` — is the checker's
    // question, not the parser's.
    const resolved = this.#matchesResolvedType(typeNode);
    return resolved;
  }

  #matchesSyntactic(typeNode: Record<string, unknown>, seen: Set<string>, constraints: ReadonlyMap<string, unknown>): boolean {
    const nodeType = typeNode.type;

    if (nodeType === 'TSBooleanKeyword') { return true; }
    // A lone literal type is a narrowing, not a vocabulary: see ClosedVocabularyType.
    if (nodeType === 'TSLiteralType') { return false; }
    if (nodeType === 'TSUnionType') {
      const result = this.#matchesUnion(typeNode.types, seen, constraints);
      return result;
    }
    if (nodeType === 'TSTypeReference') {
      const result = this.#matchesReference(typeNode, seen, constraints);
      return result;
    }
    if (nodeType === 'TSArrayType') {
      const result = this.#matches(typeNode.elementType, seen, constraints);
      return result;
    }
    if (nodeType === 'TSTypeOperator' || nodeType === 'TSRestType' || nodeType === 'TSOptionalType' || nodeType === 'TSNamedTupleMember') {
      const carried: unknown = nodeType === 'TSNamedTupleMember' ? typeNode.elementType : typeNode.typeAnnotation;
      const result = this.#matches(carried, seen, constraints);
      return result;
    }
    if (nodeType === 'TSTupleType') {
      const result = this.#matchesAny(typeNode.elementTypes, seen, constraints);
      return result;
    }

    return false;
  }

  #matchesAny(members: unknown, seen: Set<string>, constraints: ReadonlyMap<string, unknown>): boolean {
    if (!Predicates.isArray(members)) { return false; }

    const result = members.some((member) => {
      const memberResult = this.#matches(member, seen, constraints);
      return memberResult;
    });
    return result;
  }

  #matchesUnion(members: unknown, seen: Set<string>, constraints: ReadonlyMap<string, unknown>): boolean {
    if (!Predicates.isArray(members)) { return false; }

    const meaningful = members.filter((member) => {
      const result = !VocabularyAnnotation.#isNullishAnnotation(member);
      return result;
    });

    if (meaningful.length < 2) { return false; }

    const result = meaningful.every((member) => {
      const memberResult = VocabularyAnnotation.#isLiteralValue(VocabularyAnnotation.#literalOf(member))
        || this.#matches(member, seen, constraints);
      return memberResult;
    });
    return result;
  }

  static #literalOf(member: unknown): unknown {
    if (!Predicates.isRecord(member) || member.type !== 'TSLiteralType') { return undefined; }
    return member.literal;
  }

  #matchesReference(typeNode: Record<string, unknown>, seen: Set<string>, constraints: ReadonlyMap<string, unknown>): boolean {
    const name = TypeReferenceName.get(typeNode);
    if (name === undefined || seen.has(name)) { return false; }
    seen.add(name);

    if (this.#index.enums.has(name)) { return true; }

    // `<T extends boolean>(flag: T)` launders the token through a type parameter.
    if (constraints.has(name)) {
      const result = this.#matches(constraints.get(name), seen, constraints);
      return result;
    }

    const alias = this.#index.aliases.get(name);
    const result = alias !== undefined && this.#matches(alias, seen, constraints);
    return result;
  }

  // Every annotation form the syntactic walk cannot resolve — generic alias
  // instantiations, `keyof`, indexed access, `typeof`, `import(...)`, mapped types —
  // falls through to the checker when type information is available.
  #matchesResolvedType(typeNode: Record<string, unknown>): boolean {
    const services = this.#services;
    if (services === undefined) { return false; }

    const tsNode = services.esTreeNodeToTSNodeMap.get(typeNode);
    if (tsNode === undefined || !isTypeNode(tsNode)) { return false; }

    const checker = services.program.getTypeChecker();
    const resolved = checker.getTypeFromTypeNode(tsNode);
    const result = ClosedVocabularyType.matches(resolved);
    return result;
  }

  static #isLiteralValue(literal: unknown): boolean {
    if (!Predicates.isRecord(literal)) { return false; }

    // `-1 | 1` parses each member as a UnaryExpression around a numeric literal.
    if (literal.type === 'UnaryExpression') {
      const result = VocabularyAnnotation.#isLiteralValue(literal.argument);
      return result;
    }
    if (literal.type === 'TemplateLiteral') {
      const expressions: unknown = literal.expressions;
      const result = Predicates.isArray(expressions) && expressions.length === 0;
      return result;
    }
    if (literal.type !== 'Literal') { return false; }
    if (typeof literal.bigint === 'string') { return true; }

    const value = literal.value;
    const result = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    return result;
  }

  static #isNullishAnnotation(member: unknown): boolean {
    if (!Predicates.isRecord(member)) { return false; }
    const result = member.type === 'TSUndefinedKeyword' || member.type === 'TSNullKeyword';
    return result;
  }
}

/** Unwraps a parameter node to the binding that carries its type annotation and name. */
class ParameterBinding {
  public static unwrap(parameter: unknown): Record<string, unknown> | undefined {
    if (!Predicates.isRecord(parameter)) { return undefined; }

    if (parameter.type === 'AssignmentPattern') {
      const result = ParameterBinding.unwrap(parameter.left);
      return result;
    }
    if (parameter.type === 'RestElement') {
      const result = ParameterBinding.unwrap(parameter.argument);
      return result;
    }
    if (parameter.type === 'TSParameterProperty') {
      const result = ParameterBinding.unwrap(parameter.parameter);
      return result;
    }

    return parameter;
  }

  public static nameOf(binding: Record<string, unknown>): string {
    const name = binding.name;
    if (typeof name === 'string') { return name; }

    const key: unknown = binding.key;
    if (Predicates.isRecord(key)) {
      if (typeof key.name === 'string') { return key.name; }
      if (typeof key.value === 'string') { return key.value; }
    }

    if (binding.type === 'TSIndexSignature') { return 'index signature'; }

    return 'destructured parameter';
  }
}

/**
 * Collects the type parameters in scope at a node, nearest declaration first, so a
 * reference to `T` resolves against the constraint that actually binds it.
 */
class TypeParameterConstraints {
  public static forNode(node: Rule.Node, context: Rule.RuleContext): ReadonlyMap<string, unknown> {
    const constraints = new Map<string, unknown>();

    TypeParameterConstraints.#collect(node, constraints);

    const ancestors = context.sourceCode.getAncestors(node);
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
      TypeParameterConstraints.#collect(ancestors.at(index), constraints);
    }

    return constraints;
  }

  static #collect(node: unknown, constraints: Map<string, unknown>): void {
    if (!Predicates.isRecord(node)) { return; }

    const declaration: unknown = node.typeParameters;
    if (!Predicates.isRecord(declaration)) { return; }

    const parameters: unknown = declaration.params;
    if (!Predicates.isArray(parameters)) { return; }

    for (let index = 0; index < parameters.length; index += 1) {
      const parameter: unknown = parameters.at(index);
      if (!Predicates.isRecord(parameter)) { continue; }

      const identifier: unknown = parameter.name;
      if (!Predicates.isRecord(identifier) || typeof identifier.name !== 'string') { continue; }
      if (constraints.has(identifier.name)) { continue; }

      constraints.set(identifier.name, parameter.constraint);
    }
  }
}

/**
 * A `declare module 'pkg'` block describes a third-party surface rather than a frame
 * in this architecture, so nothing declared inside one is a transmission position.
 */
class AmbientAugmentation {
  public static contains(node: Rule.Node, context: Rule.RuleContext): boolean {
    const ancestors = context.sourceCode.getAncestors(node);

    for (let index = 0; index < ancestors.length; index += 1) {
      const ancestor: unknown = ancestors.at(index);
      if (!Predicates.isRecord(ancestor) || ancestor.type !== 'TSModuleDeclaration') { continue; }

      const identifier: unknown = ancestor.id;
      if (Predicates.isRecord(identifier) && identifier.type === 'Literal') { return true; }
    }

    return false;
  }
}

class AnnotationTypeNode {
  public static of(binding: Record<string, unknown>): unknown {
    const annotation: unknown = binding.typeAnnotation;
    if (!Predicates.isRecord(annotation)) { return undefined; }
    if (annotation.type !== 'TSTypeAnnotation') { return annotation; }
    return annotation.typeAnnotation;
  }

  // A rest element carries its own annotation (`...flags: boolean[]`) rather than
  // delegating to the identifier it binds, so the outer node is the fallback.
  public static ofParameter(parameter: unknown, binding: Record<string, unknown>): unknown {
    const inner = AnnotationTypeNode.of(binding);
    if (inner !== undefined) { return inner; }
    if (!Predicates.isRecord(parameter)) { return undefined; }

    const outer = AnnotationTypeNode.of(parameter);
    return outer;
  }
}

export const noThreadedVocabulary: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    if (rawOptions === undefined) { return {}; }
    const options = NoThreadedVocabularyOptionsEntity.intake(rawOptions);

    // A single synthetic layer turns the shared resolver into the binary predicate this rule
    // needs, without importing an axis the project defined for something else.
    const siteBindings: LayerBindingEntity.Type[] = [];
    for (let siteIndex = 0; siteIndex < options.resolutionSites.length; siteIndex += 1) {
      const site = options.resolutionSites.at(siteIndex);
      if (site === undefined) { continue; }
      siteBindings.push({ ...site, 'layer': RESOLUTION_SITE_LAYER });
    }

    const isResolutionSite = LayerResolver.layerForPath(context.physicalFilename, {
      'bindings': siteBindings,
      'layers': [RESOLUTION_SITE_LAYER],
      'sourceRoot': options.sourceRoot
    }) === RESOLUTION_SITE_LAYER;

    if (isResolutionSite) { return {}; }

    const servicesUnknown: unknown = context.sourceCode.parserServices;
    const services = ParserServices.has(servicesUnknown) ? servicesUnknown : undefined;
    const localVocabularyIndex = LocalVocabularyIndex.build(context.sourceCode.ast.body);
    const vocabulary = new VocabularyAnnotation(localVocabularyIndex, services);

    const report = (node: Rule.Node, name: string, messageId: string): void => {
      context.report({
        'data': { 'name': name },
        'messageId': messageId,
        'node': node
      });
    };

    const checkParameters = (node: Rule.Node): void => {
      const parameters: unknown = (node as unknown as Record<string, unknown>).params;
      if (!Predicates.isArray(parameters)) { return; }
      if (AmbientAugmentation.contains(node, context)) { return; }

      for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex += 1) {
        const parameter: unknown = parameters.at(parameterIndex);
        const binding = ParameterBinding.unwrap(parameter);
        if (binding === undefined) { continue; }
        // An explicit `this` parameter is erased at emit; no caller supplies it.
        if (binding.name === 'this') { continue; }

        const typeNode = AnnotationTypeNode.ofParameter(parameter, binding);
        if (!vocabulary.matches(typeNode, TypeParameterConstraints.forNode(node, context))) { continue; }

        report(binding as unknown as Rule.Node, ParameterBinding.nameOf(binding), 'threadedParameter');
      }
    };

    const checkMember = (node: Rule.Node, messageId: string): void => {
      if (AmbientAugmentation.contains(node, context)) { return; }

      const binding = node as unknown as Record<string, unknown>;
      const typeNode = AnnotationTypeNode.of(binding);
      if (!vocabulary.matches(typeNode, TypeParameterConstraints.forNode(node, context))) { return; }

      report(node, ParameterBinding.nameOf(binding), messageId);
    };

    const onPropertyDefinition: NonNullable<Rule.RuleListener['PropertyDefinition']> = (node) => {
      checkMember(node, 'threadedField');
    };

    const onPropertySignature = (node: Rule.Node): void => {
      checkMember(node, 'threadedProperty');
    };

    const onIndexSignature = (node: Rule.Node): void => {
      checkMember(node, 'threadedProperty');
    };

    return {
      'AccessorProperty': onPropertyDefinition,
      'ArrowFunctionExpression': checkParameters,
      'FunctionDeclaration': checkParameters,
      'FunctionExpression': checkParameters,
      'PropertyDefinition': onPropertyDefinition,
      'TSAbstractAccessorProperty': onPropertyDefinition,
      'TSAbstractPropertyDefinition': onPropertyDefinition,
      'TSDeclareFunction': checkParameters,
      'TSEmptyBodyFunctionExpression': checkParameters,
      'TSFunctionType': checkParameters,
      'TSIndexSignature': onIndexSignature,
      'TSMethodSignature': checkParameters,
      'TSPropertySignature': onPropertySignature
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow closed-vocabulary tokens (booleans, enums, literal unions) in parameter, field, and property positions outside a declared resolution site. A mode token is resolved once, where it enters the system; carrying it deeper threads a decision that has already been made.',
      'recommended': false
    },
    'messages': {
      'threadedField': "Field '{{name}}' stores a closed-vocabulary token outside a resolution site. Storing the token defers a decision already made where it entered — hold the selected implementation instead.",
      'threadedParameter': "Parameter '{{name}}' carries a closed-vocabulary token outside a resolution site. Resolve the token where it enters the system and inject the selected implementation instead of threading it.",
      'threadedProperty': "Property '{{name}}' carries a closed-vocabulary token outside a resolution site. Declare the resolved implementation on the contract instead of the token."
    },
    'schema': [NoThreadedVocabularyOptionsEntity.Schema],
    'type': 'problem'
  }
};
