import type { Rule } from 'eslint';

const BANNED_SHORTENINGS = new Set([
  'args',
  'arr',
  'buf',
  'cb',
  'cfg',
  'cnt',
  'conf',
  'ctx',
  'curr',
  'dlq',
  'doc',
  'dst',
  'env',
  'err',
  'fn',
  'idx',
  'kv',
  'len',
  'lst',
  'max',
  'mgr',
  'min',
  'mq',
  'msg',
  'num',
  'nxt',
  'obj',
  'opts',
  'params',
  'prev',
  'ptr',
  'rcv',
  'ref',
  'repo',
  'ret',
  'snd',
  'src',
  'str',
  'svc',
  'tmp',
  'util',
  'utils',
  'val'
]);

const WHITELISTED_ACRONYMS = new Set([
  'Ajv',
  'ALS',
  'ANSI',
  'API',
  'ASCII',
  'BVH',
  'CD',
  'CI',
  'CLI',
  'CPU',
  'CRLF',
  'CSR',
  'CSS',
  'CSV',
  'DI',
  'DNS',
  'DOM',
  'ESLintUtils',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'FromSchema',
  'FSM',
  'GPU',
  'GraphQL',
  'gRPC',
  'HTML',
  'HTTP',
  'HTTPS',
  'IndexedDb',
  'IP',
  'IPv4',
  'IPv6',
  'IRI',
  'JSON',
  'JsonValue',
  'JWT',
  'KeyValueStore',
  'LF',
  'LOD',
  // Least-Recently-Used — used by this repo's cache package (e.g. LruCache).
  'LRU',
  'maxBindGroups',
  'maxBindGroupsPlusVertexBuffers',
  'maxBindingsPerBindGroup',
  'maxBufferSize',
  'maxColorAttachmentBytesPerSample',
  'maxColorAttachments',
  'maxComputeInvocationsPerWorkgroup',
  'maxComputeWorkgroupSizeX',
  'maxComputeWorkgroupSizeY',
  'maxComputeWorkgroupSizeZ',
  'maxComputeWorkgroupsPerDimension',
  'maxComputeWorkgroupStorageSize',
  'maxContains',
  'maxDynamicStorageBuffersPerPipelineLayout',
  'maxDynamicUniformBuffersPerPipelineLayout',
  'maxImmediateSize',
  'maximum',
  'maxInterStageShaderVariables',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maxSampledTexturesPerShaderStage',
  'maxSamplersPerShaderStage',
  'maxStorageBufferBindingSize',
  'maxStorageBuffersInFragmentStage',
  'maxStorageBuffersInVertexStage',
  'maxStorageBuffersPerShaderStage',
  'maxStorageTexturesInFragmentStage',
  'maxStorageTexturesInVertexStage',
  'maxStorageTexturesPerShaderStage',
  'maxTextureArrayLayers',
  'maxTextureDimension1D',
  'maxTextureDimension2D',
  'maxTextureDimension3D',
  'maxUniformBufferBindingSize',
  'maxUniformBuffersPerShaderStage',
  'maxVertexAttributes',
  'maxVertexBufferArrayStride',
  'maxVertexBuffers',
  'MIME',
  'minContains',
  'minimum',
  'minItems',
  // JSON Schema 2020-12 keywords — standards-defined, preserved as-is.
  'minLength',
  'minProperties',
  'minStorageBufferOffsetAlignment',
  'minUniformBufferOffsetAlignment',
  'multipleOf',
  'NaN',
  'NQuads',
  'NTriples',
  'OAuth',
  'OIDC',
  'OPFS',
  'OWL',
  'PRD',
  'RAM',
  'RDF',
  'RDFC',
  'REST',
  'SDF',
  'SDK',
  'SHACL',
  'SPARQL',
  'SSD',
  'SSL',
  'TCP',
  'TLS',
  'TOML',
  'TRD',
  'TriG',
  'TSV',
  // Time-To-Live — used across this repo's cache/clock packages.
  'TTL',
  'UDP',
  'uniqueItems',
  'URI',
  'URL',
  'UTF',
  'UTF8',
  'UTF16',
  // Universally Unique Identifier — used across this repo's entity/store packages.
  'UUID',
  'WASM',
  'WebGL',
  'WebGPU',
  'WGSL',
  'XML',
  'YAML'
]);

const LOOP_ITERATOR_PATTERN = /^[ijk]$/v;

const CAMEL_TOKEN_PATTERN = /[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/gv;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

class CamelCase {
  public static split(name: string): string[] {
    const tokens: string[] = [];

    CAMEL_TOKEN_PATTERN.lastIndex = 0;
    let match = CAMEL_TOKEN_PATTERN.exec(name);

    while (match !== null) {
      tokens.push(match[0]);
      match = CAMEL_TOKEN_PATTERN.exec(name);
    }

    return tokens;
  }
}

class BannedToken {
  public static find(name: string): string | undefined {
    if (LOOP_ITERATOR_PATTERN.test(name)) {
      return undefined;
    }
    if (WHITELISTED_ACRONYMS.has(name)) {
      return undefined;
    }

    const tokens = CamelCase.split(name);
    const found = tokens.find((token) => {
      return !WHITELISTED_ACRONYMS.has(token) && BANNED_SHORTENINGS.has(token.toLowerCase());
    });

    return found !== undefined ? found.toLowerCase() : undefined;
  }
}

class IdentifierName {
  public static get(node: unknown): string | undefined {
    if (!isObject(node)) {
      return undefined;
    }
    const name: unknown = node.name;

    return typeof name === 'string' ? name : undefined;
  }
}

const reportIfBanned = (
  name: string,
  node: Rule.Node,
  context: Rule.RuleContext
): void => {
  const bannedToken = BannedToken.find(name);

  if (bannedToken !== undefined) {
    context.report({
      'data': {
        'name': name,
        'token': bannedToken
      },
      'messageId': 'banned-shortening',
      'node': node
    });
  }
};

class NoProjectInternalAcronyms {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    function getNodeProperty(node: Rule.Node, property: string): unknown {
      const nodeAsObject: unknown = node;

      return isObject(nodeAsObject) ? nodeAsObject[property] : undefined;
    }

    function onNodeWithId(node: Rule.Node): void {
      const name = IdentifierName.get(getNodeProperty(node, 'id'));

      if (name !== undefined) {
        reportIfBanned(name, node, context);
      }
    }

    function onIdentifier(node: Rule.Node): void {
      const parent: unknown = getNodeProperty(node, 'parent');

      if (!isObject(parent)) {
        return;
      }
      const parentType: unknown = parent.type;

      if (
        parentType === 'ExportSpecifier'
        || parentType === 'FunctionDeclaration'
        || parentType === 'MethodDefinition'
        || parentType === 'Property'
        || parentType === 'PropertyDefinition'
        || parentType === 'TSEnumMember'
        || parentType === 'TSMethodSignature'
        || parentType === 'TSPropertySignature'
        || parentType === 'TSTypeParameter'
        || parentType === 'VariableDeclarator'
      ) {
        return;
      }
      if (parentType === 'MemberExpression') {
        const computed: unknown = parent.computed;
        const property: unknown = parent.property;

        if (computed === false && property === node) {
          return;
        }
      }

      const name = IdentifierName.get(node);

      if (name !== undefined) {
        reportIfBanned(name, node, context);
      }
    }

    function onNodeWithKey(node: Rule.Node): void {
      const name = IdentifierName.get(getNodeProperty(node, 'key'));

      if (name !== undefined) {
        reportIfBanned(name, node, context);
      }
    }

    function onTSTypeParameter(node: Rule.Node): void {
      const name = IdentifierName.get(getNodeProperty(node, 'name'));

      if (name !== undefined) {
        reportIfBanned(name, node, context);
      }
    }

    return {
      'FunctionDeclaration': onNodeWithId,
      'Identifier': onIdentifier,
      'MethodDefinition': onNodeWithKey,
      'Property': onNodeWithKey,
      'PropertyDefinition': onNodeWithKey,
      'TSEnumMember': onNodeWithId,
      'TSMethodSignature': onNodeWithKey,
      'TSPropertySignature': onNodeWithKey,
      'TSTypeParameter': onTSTypeParameter,
      'VariableDeclarator': onNodeWithId
    };
  }
}

export const noProjectInternalAcronyms: Rule.RuleModule = {
  'create': NoProjectInternalAcronyms.create,
  'meta': {
    'docs': {
      'description': 'Bans internal shorthand identifiers (cb, dlq, cfg, opts, ctx, idx, etc.) in favour of descriptive names.',
      'recommended': false
    },
    'messages': { 'banned-shortening': 'Identifier \'{{name}}\' contains the banned shortening \'{{token}}\'. Rename to a descriptive form. Suggested replacements: cb→callback, dlq→deadLetterQueue, cfg→config, opts→options, ctx→context, idx→index, mgr→manager, svc→service, lst→list, val→value, tmp→temporary, fn→function, ret→returnValue, err→error, msg→message, args→argumentList, params→parameters, prev→previous, curr→current, nxt→next, doc→document, env→environment, src→source, dst→destination, num→number, str→string, obj→object, arr→array, len→length, cnt→count, buf→buffer, ptr→pointer, ref→reference, repo→repository, conf→configuration.' },
    'schema': [],
    'type': 'problem'
  }
};
