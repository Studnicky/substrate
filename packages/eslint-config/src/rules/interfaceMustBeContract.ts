import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/node';
import {
  type InterfaceDeclaration, isInterfaceDeclaration, type Node, type Program
} from 'typescript';

import { TypeContractClassification } from './shared/TypeContractClassification.js';

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) {
      return false;
    }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;

    if (!Predicates.isRecord(program) || !Predicates.isRecord(nodeMap)) {
      return false;
    }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
    return result;
  }
}

/** Reporters for the two interface contract violations. */
class InterfaceContractReports {
  /** Reports pure JSON data expressed as an interface instead of a schema-derived entity type. */
  public static checkDataShapeMustBeType(
    context: Rule.RuleContext,
    classification: TypeContractClassification,
    node: Rule.Node,
    declaration: InterfaceDeclaration
  ): void {
    if (classification.analyzeInterface(declaration).classification === 'contract') {
      return;
    }
    // D3 (see the eslint-config objectives) — PAIRED RULE `all-types-are-entities`: the
    // schema-derived entity-interface pattern (`export interface Type extends
    // FromSchema<typeof Schema> {}` inside a `*Entity` namespace, added in commit 04083ad) is
    // pure data BY CONSTRUCTION, so `analyzeInterface` above always classifies it `pureData`,
    // never `contract` — without this exemption every such interface was rejected
    // unconditionally, even though `all-types-are-entities` requires and accepts exactly this
    // shape. See `TypeContractClassification.isCanonicalEntityInterface`'s doc comment for the
    // full VERIFIED probe and the unresolved `naming-convention` conflict this does not fix.
    if (classification.isCanonicalEntityInterface(declaration)) {
      return;
    }

    context.report({
      'data': { 'name': declaration.name.text },
      'messageId': 'dataShapeMustBeType',
      'node': node
    });
  }

  /** Reports a contract interface whose name does not end with 'Interface', including inside namespaces. */
  public static checkMissingInterfaceSuffix(
    context: Rule.RuleContext,
    classification: TypeContractClassification,
    node: Rule.Node,
    declaration: InterfaceDeclaration
  ): void {
    if (classification.analyzeInterface(declaration).classification === 'pureData') {
      return;
    }

    const name = declaration.name.text;

    if (name.endsWith('Interface')) {
      return;
    }

    context.report({
      'data': { 'name': name },
      'messageId': 'missing-interface-suffix',
      'node': node
    });
  }
}

export const interfaceMustBeContract: Rule.RuleModule = {
  'create': (context) => {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!ParserServices.has(servicesUnknown)) {
      return {};
    }

    const classification = TypeContractClassification.forProgram(servicesUnknown.program);

    const visitTSInterfaceDeclaration = (node: Rule.Node): void => {
      const declaration = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

      if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
        return;
      }

      InterfaceContractReports.checkDataShapeMustBeType(context, classification, node, declaration);
      InterfaceContractReports.checkMissingInterfaceSuffix(context, classification, node, declaration);
    };

    return { 'TSInterfaceDeclaration': visitTSInterfaceDeclaration };
  },
  'meta': {
    'docs': {
      'description':
        'Interfaces express runtime and access contracts. A pure JSON-data interface must be replaced with a schema-derived entity type or canonical pure-data composition. Every retained contract interface name must end with \'Interface\', including inside namespaces.'
    },
    'messages': {
      'dataShapeMustBeType':
        "Interface '{{name}}' contains only pure data and has no runtime or access-contract signal. Define the data as a schema-derived entity type or compose an existing canonical pure-data type; this remediation requires entity/schema construction and is not autofixed.",
      'missing-interface-suffix':
        'Interface name \'{{name}}\' must end with \'Interface\'. This applies everywhere, including inside namespaces — the suffix is not optional.'
    },
    'schema': [],
    'type': 'problem'
  }
};
