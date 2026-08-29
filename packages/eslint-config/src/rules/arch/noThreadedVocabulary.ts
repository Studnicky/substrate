import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type * as TypeScript from 'typescript';

import { SchemaValidator } from '@studnicky/json';
import { isTypeReferenceNode, type Node, type Program, TypeFlags } from 'typescript';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

namespace NoThreadedVocabularyOptionsEntity {
  export const Schema = {
    ...LayerOptionsEntity.Schema,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'adapterLayerName': {
        'default': 'adapters',
        'description': 'Name of the layer permitted to receive a closed-vocabulary token and resolve it into a port implementation. Defaults to "adapters".',
        'type': 'string'
      }
    }
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!ObjectGuard.isObject(program) || !ObjectGuard.isObject(nodeMap)) { return false; }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
    return result;
  }
}

/** Resolves a `TSTypeReference` node down to the bare name it references. */
class TypeReferenceName {
  public static get(typeNode: Record<string, unknown>): string | undefined {
    const typeName: unknown = typeNode.typeName;
    if (!ObjectGuard.isObject(typeName)) { return undefined; }

    if (typeName.type === 'Identifier') {
      const name = typeName.name;
      const result = typeof name === 'string' ? name : undefined;
      return result;
    }

    if (typeName.type === 'TSQualifiedName') {
      const right: unknown = typeName.right;
      if (!ObjectGuard.isObject(right)) { return undefined; }
      const name = right.name;
      const result = typeof name === 'string' ? name : undefined;
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

    if (!ObjectGuard.isArray(body)) {
      const empty = new LocalVocabularyIndex(enums, aliases);
      return empty;
    }

    for (let index = 0; index < body.length; index += 1) {
      const declaration = LocalVocabularyIndex.#unwrapExport(body.at(index));
      if (!ObjectGuard.isObject(declaration)) { continue; }

      const identifier: unknown = declaration.id;
      if (!ObjectGuard.isObject(identifier) || typeof identifier.name !== 'string') { continue; }

      if (declaration.type === 'TSEnumDeclaration') {
        enums.add(identifier.name);
        continue;
      }
      if (declaration.type === 'TSTypeAliasDeclaration') {
        aliases.set(identifier.name, declaration.typeAnnotation);
      }
    }

    const built = new LocalVocabularyIndex(enums, aliases);
    return built;
  }

  static #unwrapExport(statement: unknown): unknown {
    if (!ObjectGuard.isObject(statement)) { return statement; }
    if (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') {
      return statement.declaration;
    }
    return statement;
  }
}

/** Reads a TypeScript type and reports whether it is a closed set of literal members. */
class ClosedVocabularyType {
  public static matches(type: TypeScript.Type): boolean {
    if (type.isUnion()) {
      const meaningful = type.types.filter((member) => {
        const result = !ClosedVocabularyType.#isNullish(member);
        return result;
      });

      if (meaningful.length === 0) { return false; }

      const result = meaningful.every((member) => {
        const memberResult = ClosedVocabularyType.#isLiteral(member);
        return memberResult;
      });
      return result;
    }

    const result = ClosedVocabularyType.#isLiteral(type);
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

  public matches(typeNode: unknown): boolean {
    const result = this.#matches(typeNode, new Set<string>());
    return result;
  }

  #matches(typeNode: unknown, seen: Set<string>): boolean {
    if (!ObjectGuard.isObject(typeNode)) { return false; }

    const nodeType = typeNode.type;

    if (nodeType === 'TSBooleanKeyword') { return true; }
    if (nodeType === 'TSLiteralType') {
      const result = VocabularyAnnotation.#isLiteralValue(typeNode.literal);
      return result;
    }
    if (nodeType === 'TSUnionType') {
      const result = this.#matchesUnion(typeNode.types, seen);
      return result;
    }
    if (nodeType === 'TSTypeReference') {
      const result = this.#matchesReference(typeNode, seen);
      return result;
    }

    return false;
  }

  #matchesUnion(members: unknown, seen: Set<string>): boolean {
    if (!ObjectGuard.isArray(members)) { return false; }

    const meaningful = members.filter((member) => {
      const result = !VocabularyAnnotation.#isNullishAnnotation(member);
      return result;
    });

    if (meaningful.length === 0) { return false; }

    const result = meaningful.every((member) => {
      const memberResult = this.#matches(member, seen);
      return memberResult;
    });
    return result;
  }

  #matchesReference(typeNode: Record<string, unknown>, seen: Set<string>): boolean {
    const name = TypeReferenceName.get(typeNode);
    if (name === undefined || seen.has(name)) { return false; }
    seen.add(name);

    if (this.#index.enums.has(name)) { return true; }

    const alias = this.#index.aliases.get(name);
    if (alias !== undefined) {
      const result = this.#matches(alias, seen);
      return result;
    }

    const result = this.#matchesResolvedType(typeNode);
    return result;
  }

  #matchesResolvedType(typeNode: Record<string, unknown>): boolean {
    const services = this.#services;
    if (services === undefined) { return false; }

    const tsNode = services.esTreeNodeToTSNodeMap.get(typeNode);
    if (tsNode === undefined || !isTypeReferenceNode(tsNode)) { return false; }

    const checker = services.program.getTypeChecker();
    const resolved = checker.getTypeFromTypeNode(tsNode);
    const result = ClosedVocabularyType.matches(resolved);
    return result;
  }

  static #isLiteralValue(literal: unknown): boolean {
    if (!ObjectGuard.isObject(literal) || literal.type !== 'Literal') { return false; }

    const value = literal.value;
    const result = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    return result;
  }

  static #isNullishAnnotation(member: unknown): boolean {
    if (!ObjectGuard.isObject(member)) { return false; }
    const result = member.type === 'TSUndefinedKeyword' || member.type === 'TSNullKeyword';
    return result;
  }
}

/** Unwraps a parameter node to the binding that carries its type annotation and name. */
class ParameterBinding {
  public static unwrap(parameter: unknown): Record<string, unknown> | undefined {
    if (!ObjectGuard.isObject(parameter)) { return undefined; }

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
    if (ObjectGuard.isObject(key)) {
      if (typeof key.name === 'string') { return key.name; }
      if (typeof key.value === 'string') { return key.value; }
    }

    return 'destructured parameter';
  }
}

class AnnotationTypeNode {
  public static of(binding: Record<string, unknown>): unknown {
    const annotation: unknown = binding.typeAnnotation;
    if (!ObjectGuard.isObject(annotation)) { return undefined; }
    if (annotation.type !== 'TSTypeAnnotation') { return annotation; }
    return annotation.typeAnnotation;
  }
}

export const noThreadedVocabulary: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    if (rawOptions === undefined) { return {}; }
    const options = NoThreadedVocabularyOptionsEntity.intake(rawOptions);

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    if (sourceLayer === undefined || sourceLayer === options.adapterLayerName) { return {}; }

    const servicesUnknown: unknown = context.sourceCode.parserServices;
    const services = ParserServices.has(servicesUnknown) ? servicesUnknown : undefined;
    const localVocabularyIndex = LocalVocabularyIndex.build(context.sourceCode.ast.body);
    const vocabulary = new VocabularyAnnotation(localVocabularyIndex, services);

    const report = (node: Rule.Node, name: string, messageId: string): void => {
      context.report({
        'data': {
          'adapterLayer': options.adapterLayerName,
          'layer': sourceLayer,
          'name': name
        },
        'messageId': messageId,
        'node': node
      });
    };

    const checkParameters = (node: Rule.Node): void => {
      const parameters: unknown = (node as unknown as Record<string, unknown>).params;
      if (!ObjectGuard.isArray(parameters)) { return; }

      for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex += 1) {
        const binding = ParameterBinding.unwrap(parameters.at(parameterIndex));
        if (binding === undefined) { continue; }

        const typeNode = AnnotationTypeNode.of(binding);
        if (!vocabulary.matches(typeNode)) { continue; }

        report(binding as unknown as Rule.Node, ParameterBinding.nameOf(binding), 'threadedParameter');
      }
    };

    const checkMember = (node: Rule.Node, messageId: string): void => {
      const binding = node as unknown as Record<string, unknown>;
      const typeNode = AnnotationTypeNode.of(binding);
      if (!vocabulary.matches(typeNode)) { return; }

      report(node, ParameterBinding.nameOf(binding), messageId);
    };

    const onPropertyDefinition: NonNullable<Rule.RuleListener['PropertyDefinition']> = (node) => {
      checkMember(node, 'threadedField');
    };

    const onPropertySignature = (node: Rule.Node): void => {
      checkMember(node, 'threadedProperty');
    };

    return {
      'ArrowFunctionExpression': checkParameters,
      'FunctionDeclaration': checkParameters,
      'FunctionExpression': checkParameters,
      'PropertyDefinition': onPropertyDefinition,
      'TSDeclareFunction': checkParameters,
      'TSEmptyBodyFunctionExpression': checkParameters,
      'TSFunctionType': checkParameters,
      'TSMethodSignature': checkParameters,
      'TSPropertySignature': onPropertySignature
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow closed-vocabulary tokens (booleans, enums, literal unions) in parameter, field, and property positions outside the adapters layer. A transport/mode token is resolved once, where it enters the system; carrying it deeper threads a decision that has already been made.',
      'recommended': false
    },
    'messages': {
      'threadedField': "Field '{{name}}' stores a closed-vocabulary token in layer '{{layer}}'. Storing the token defers a decision that layer '{{adapterLayer}}' already made — hold the selected port instead.",
      'threadedParameter': "Parameter '{{name}}' carries a closed-vocabulary token into layer '{{layer}}'. Resolve the token in layer '{{adapterLayer}}' and inject the selected port instead of threading it.",
      'threadedProperty': "Property '{{name}}' carries a closed-vocabulary token through layer '{{layer}}'. Declare the resolved port on the contract instead of the token layer '{{adapterLayer}}' resolves."
    },
    'schema': [NoThreadedVocabularyOptionsEntity.Schema],
    'type': 'problem'
  }
};
