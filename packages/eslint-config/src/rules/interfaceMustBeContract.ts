import type { Rule } from 'eslint';

/**
 * interface-must-be-contract — interfaces express runtime contracts, not data.
 *
 * The law: a `type` is JSON-serializable and validatable (schema-derived); an
 * `interface` is a runtime contract that carries the members a type cannot —
 * functions, constructors, and references to class instances. An interface that
 * contains ONLY JSON-serializable property/index signatures (primitives, plain
 * object literals, arrays of those) is a data shape wearing the wrong keyword
 * and must be declared as a schema-derived `type XxxType` in an entity instead.
 *
 * A member is a "contract signal" — and therefore makes the interface a
 * legitimate contract — when it is a method/call/construct signature, OR a
 * property whose annotation contains a function type (`() => T`), a constructor
 * type (`new () => T`), or a named-type reference (`Clock`, `Logger`). Those are
 * exactly the members that are NOT serializable to JSON.
 */

const CONTRACT_SIGNAL_TYPES = new Set([
  // Constructor-call property shapes — factory members.
  'TSConstructorType',
  // Callable property shapes (e.g. `readonly fn: () => T`) — function members.
  'TSFunctionType',
  // Named type references (e.g. `Clock`, `Logger`) — class-instance properties.
  'TSTypeReference'
]);

const METHOD_SIGNATURE_TYPES = new Set([
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
  'TSMethodSignature'
]);

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

const hasMethodSignature = (members: readonly unknown[]): boolean => {
  const membersLength = members.length;

  for (let index = 0; index < membersLength; index++) {
    const member: unknown = members[index];

    if (!isObject(member)) { continue; }
    const memberType: unknown = member.type;

    if (typeof memberType === 'string' && METHOD_SIGNATURE_TYPES.has(memberType)) {
      return true;
    }
  }

  return false;
};

/**
 * Walks an AST subtree looking for any node whose type is a contract signal.
 * Returns `true` as soon as one is found — such a node means the surrounding
 * property is non-serializable, so the interface is a contract, not data.
 */
const containsContractSignal = (rawNode: unknown): boolean => {
  if (!isObject(rawNode)) { return false; }
  const nodeType: unknown = rawNode.type;

  if (typeof nodeType === 'string' && CONTRACT_SIGNAL_TYPES.has(nodeType)) {
    return true;
  }
  const keys = Object.keys(rawNode);
  const keysLength = keys.length;

  for (let index = 0; index < keysLength; index++) {
    const key = keys[index];

    if (key === undefined || key === 'parent' || key === 'loc' || key === 'range') {
      continue;
    }
    const child: unknown = rawNode[key];

    if (Array.isArray(child)) {
      const childLength = child.length;

      for (let childIndex = 0; childIndex < childLength; childIndex++) {
        if (containsContractSignal(child[childIndex])) { return true; }
      }
    } else if (containsContractSignal(child)) {
      return true;
    }
  }

  return false;
};

/**
 * Returns `true` when the interface body is a pure JSON-serializable data shape:
 * no method/call/construct signatures, and no property annotation carrying a
 * contract signal. An empty interface (`{}`) is a pure data shape (empty record).
 */
const isPureDataShape = (members: readonly unknown[]): boolean => {
  if (hasMethodSignature(members)) { return false; }

  const membersLength = members.length;

  for (let index = 0; index < membersLength; index++) {
    const member: unknown = members[index];

    if (!isObject(member)) { continue; }
    const memberType: unknown = member.type;

    if (memberType !== 'TSPropertySignature' && memberType !== 'TSIndexSignature') {
      continue;
    }
    if (containsContractSignal(member.typeAnnotation)) { return false; }
  }

  return true;
};

export const interfaceMustBeContract: Rule.RuleModule = {
  'create': (context) => {
    const options = context.options[0] as { 'allow'?: string[] } | undefined;
    const allow = new Set(options?.allow ?? []);

    return {
      'TSInterfaceDeclaration': (node: Rule.Node) => {
        const rawNode = node as unknown as {
          'body': { 'body': readonly unknown[] };
          'id': { 'name': string };
        };

        if (allow.has(rawNode.id.name)) { return; }

        if (isPureDataShape(rawNode.body.body)) {
          context.report({
            'data': { 'name': rawNode.id.name },
            'messageId': 'dataShapeMustBeType',
            'node': node
          });
        }
      }
    };
  },
  'meta': {
    'docs': {
      'description':
        'Interfaces express runtime contracts (functions, constructors, class references). A pure JSON-serializable data shape must be a schema-derived `type XxxType`, not an `interface`.'
    },
    'messages': {
      'dataShapeMustBeType':
        "Interface '{{name}}' contains only JSON-serializable property/index signatures and no contract signal (method, call, construct signature, function-valued property, or named-type reference). Data shapes must be declared as a schema-derived `type {{name}}Type` in an entity; `interface` is reserved for runtime contracts."
    },
    'schema': [
      {
        'additionalProperties': false,
        'properties': {
          'allow': {
            'items': { 'type': 'string' },
            'type': 'array'
          }
        },
        'type': 'object'
      }
    ],
    'type': 'problem'
  }
};
