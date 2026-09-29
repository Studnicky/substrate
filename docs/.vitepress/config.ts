import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

import pkg from '../../package.json';
import { BROWSER_SWAPS } from './browser-swaps.js';

const packageJson = pkg as {
  'substrate'?: { 'seo'?: { 'bingSiteVerification'?: string; 'googleSiteVerification'?: string; 'twitterHandle'?: string } };
};

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

type ResolveOptionsType = Record<string, unknown> & { readonly 'ssr'?: boolean };

interface ResolvedIdInterface {
  readonly 'id': string;
}

interface PluginContextInterface {
  resolve(
    source: string,
    importer: string,
    options: Record<string, unknown>
  ): Promise<ResolvedIdInterface | null>;
}

const substrateBrowserSwap = (): {
  'enforce': 'pre';
  'name': string;
  'resolveId': (this: PluginContextInterface, source: string, importer: string | undefined, options?: ResolveOptionsType) => Promise<string | null>;
} => {
  return {
    'enforce': 'pre',
    'name': 'substrate-browser-swap',
    'resolveId': async function (this: PluginContextInterface, source: string, importer: string | undefined, options?: ResolveOptionsType): Promise<string | null> {
      // SSR runs in Node, where the Node providers work; only swap for the client.
      if (options?.ssr === true || importer === undefined) {
        return null;
      }
      // Forward the original resolve options so downstream resolvers behave correctly.
      const resolved = await this.resolve(source, importer, { ...options, 'skipSelf': true });
      if (resolved === null) {
        return null;
      }
      const id = resolved.id.replace(/\\/g, '/');
      for (const [from, to] of BROWSER_SWAPS) {
        if (id.endsWith(`/${from}.ts`) || id.endsWith(`/${from}.js`)) {
          return `${REPO_ROOT}${to}.ts`;
        }
      }
      return null;
    }
  };
};

const SITE_TITLE = 'Substrate';
const SITE_DESCRIPTION = 'Composable TypeScript primitives for builders: matching, routing, filtering, state, concurrency, time, I/O, and structured errors. Each package supplies focused contracts and operations that consumers combine into their own applications.';
const SITE_URL = 'https://studnicky.github.io/substrate/';
const SITE_BASE = '/substrate/';
const SITE_OG_IMAGE = `${SITE_URL}og-image.png`;
const SITE_THEME_COLOR = '#7c5aed';
const SITE_KEYWORDS = 'typescript,composable,primitives,matching,filtering,topic-routing,semantic-matching,vectorization,retry,throttle,mutex,scheduler,clock,async-context,pipeline,logger,errors,json,monorepo,esm,node,fsm,lifecycle-hooks,dependency-injection,circular-buffer,batch,timing,types,config,fetch,cache,concurrency,event-bus,file-lock,resilience,signal,system,abort-signal,circuit-breaker,token-bucket,dead-letter-queue';
const SITE_AUTHOR_NAME = 'Andrew Studnicky';
const SITE_AUTHOR_URL = 'https://github.com/Studnicky';
const SITE_REPO = 'https://github.com/Studnicky/substrate';
const SITE_LOGO = `${SITE_URL}og-image.png`;

const seo = packageJson.substrate?.seo ?? {};
const googleVerify = seo.googleSiteVerification ?? '';
const bingVerify = seo.bingSiteVerification ?? '';
const twitterHandle = seo.twitterHandle ?? '';

const ESLINT_CONFIG_RULES = [
  'adapter-only-import', 'all-types-are-entities', 'clean-diagnostics',
  'descriptive-identifiers', 'direct-invocation-only', 'domain-purity', 'entity-file-shape',
  'explicit-return-binding', 'export-shape', 'hash-private-fields', 'inline-trivial-logic', 'intake-parse-only', 'interface-must-be-contract',
  'interfaces-compose-named-types', 'known-types-outside-adapters', 'layer-import-boundary',
  'lexical-this-only', 'no-caller-chosen-guard-type', 'no-circular-imports', 'no-double-assertion', 'no-function-registries', 'no-mixed-callable-shapes', 'no-redefined-external-types', 'no-reflect-argument-laundering', 'no-threaded-vocabulary', 'no-unchecked-overload-implementation', 'no-unparsed-assertion', 'prefer-collection-types', 'require-options-object',
  'static-method-verbs', 'type-alias-invariants'
] as const;

const ESLINT_V8_RULES = [
  'arguments-object', 'array-concat-outside-loops', 'array-from-iterators', 'array-from-map-callback',
  'array-scan-outside-loops', 'array-splice-outside-loops', 'array-spread-outside-loops',
  'chained-array-iteration', 'computed-class-properties', 'computed-object-properties',
  'conditional-property-assignment', 'define-property', 'delete-property', 'dynamic-property-access',
  'eval-function', 'for-in-loops', 'for-of-arrays', 'inline-arrow-functions', 'inline-functions',
  'max-switch-cases', 'memoize-array-length', 'object-spread', 'prototype-modification',
  'regexp-in-loops', 'switch-statements', 'try-catch-in-loops', 'with-statement'
] as const;

const STATEFUL = [
  'batch', 'boundary-kit', 'bounded-dispatcher', 'cache', 'circular-buffer', 'clock', 'concurrency', 'context',
  'entity-store', 'event-bus', 'file-lock', 'flag-evaluator', 'fsm', 'health-registry', 'idempotency-guard',
  'keyed-rate-limiter', 'keyed-work-gate', 'logger', 'memoize', 'mutex', 'paginator', 'pipeline', 'process-kit',
  'request-executor', 'resilience', 'retry', 'sample-buffer', 'scheduler',
  'store', 'strata-store-kit', 'throttle', 'timing', 'virtual-fs', 'visible-range', 'worker-pool'
] as const;

const STATELESS = [
  'config', 'drilldown', 'entity', 'errors', 'eslint-config', 'example-smoke-kit', 'fetch', 'json',
  'scenario-kit', 'signal', 'system', 'types'
] as const;

const MATCHING_AND_ROUTING = [
  'filters', 'matching', 'matching-filters', 'semantic-matching',
  'topic-router', 'topic-router-models'
] as const;

type HeadConfig = [string, Record<string, string>] | [string, Record<string, string>, string];

const conditionalHead: HeadConfig[] = [
  ...(googleVerify !== '' ? [['meta', { 'content': googleVerify, 'name': 'google-site-verification' }] as HeadConfig] : []),
  ...(bingVerify !== '' ? [['meta', { 'content': bingVerify, 'name': 'msvalidate.01' }] as HeadConfig] : []),
  ...(twitterHandle !== '' ? [['meta', { 'content': `@${twitterHandle}`, 'name': 'twitter:site' }] as HeadConfig] : []),
  ...(twitterHandle !== '' ? [['meta', { 'content': `@${twitterHandle}`, 'name': 'twitter:creator' }] as HeadConfig] : [])
];

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  'author': { '@type': 'Person', 'name': SITE_AUTHOR_NAME, 'url': SITE_AUTHOR_URL },
  'codeRepository': SITE_REPO,
  'description': SITE_DESCRIPTION,
  'image': SITE_LOGO,
  'license': 'MIT',
  'name': SITE_TITLE,
  'programmingLanguage': 'TypeScript',
  'runtimePlatform': 'Node.js',
  'url': SITE_URL
});

export default withMermaid(defineConfig({
  'appearance': true,
  'base': SITE_BASE,
  'cleanUrls': true,
  'description': SITE_DESCRIPTION,
  'head': [
    ['link', { 'href': `${SITE_BASE}favicon.ico`, 'rel': 'icon', 'type': 'image/x-icon' }],
    ['link', { 'href': `${SITE_BASE}icon-32.png`, 'rel': 'icon', 'sizes': '32x32', 'type': 'image/png' }],
    ['link', { 'href': `${SITE_BASE}icon-16.png`, 'rel': 'icon', 'sizes': '16x16', 'type': 'image/png' }],
    ['link', { 'href': `${SITE_BASE}apple-touch-icon.png`, 'rel': 'apple-touch-icon', 'sizes': '180x180' }],
    ['link', { 'href': `${SITE_BASE}manifest.webmanifest`, 'rel': 'manifest' }],
    ['meta', { 'content': SITE_THEME_COLOR, 'name': 'theme-color' }],
    ['meta', { 'content': 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1', 'name': 'robots' }],
    ['meta', { 'content': SITE_AUTHOR_NAME, 'name': 'author' }],
    ['meta', { 'content': SITE_KEYWORDS, 'name': 'keywords' }],
    ['meta', { 'content': 'Substrate', 'name': 'application-name' }],
    ['meta', { 'content': 'website', 'property': 'og:type' }],
    ['meta', { 'content': SITE_TITLE, 'property': 'og:site_name' }],
    ['meta', { 'content': SITE_TITLE, 'property': 'og:title' }],
    ['meta', { 'content': SITE_DESCRIPTION, 'property': 'og:description' }],
    ['meta', { 'content': SITE_URL, 'property': 'og:url' }],
    ['meta', { 'content': SITE_OG_IMAGE, 'property': 'og:image' }],
    ['meta', { 'content': 'image/png', 'property': 'og:image:type' }],
    ['meta', { 'content': '1200', 'property': 'og:image:width' }],
    ['meta', { 'content': '630', 'property': 'og:image:height' }],
    ['meta', { 'content': SITE_OG_IMAGE, 'property': 'og:image:secure_url' }],
    ['meta', { 'content': SITE_TITLE, 'property': 'og:image:alt' }],
    ['meta', { 'content': 'en_US', 'property': 'og:locale' }],
    ['meta', { 'content': 'summary_large_image', 'name': 'twitter:card' }],
    ['meta', { 'content': SITE_TITLE, 'name': 'twitter:title' }],
    ['meta', { 'content': SITE_DESCRIPTION, 'name': 'twitter:description' }],
    ['meta', { 'content': SITE_OG_IMAGE, 'name': 'twitter:image' }],
    ...conditionalHead,
    ['script', { 'type': 'application/ld+json' }, jsonLd]
  ],
  'lang': 'en-US',
  'lastUpdated': true,
  'mermaid': {
    'flowchart': {
      'htmlLabels': true,
      'nodeSpacing': 28,
      'rankSpacing': 44,
      'useMaxWidth': true
    },
    'theme': 'base',
    'themeVariables': {
      'background': '#ffffff',
      'fontFamily': 'var(--vp-font-family-mono)',
      'lineColor': '#94a3b8',
      'primaryBorderColor': '#7c5aed',
      'primaryColor': '#f5f3ff',
      'primaryTextColor': '#2e1065',
      'secondaryColor': '#faf5ff',
      'tertiaryColor': '#f8fafc',
      'textColor': '#334155'
    }
  },
  'mermaidPlugin': { 'class': 'mermaid substrate-mermaid' },
  'sitemap': { 'hostname': SITE_URL },

  'themeConfig': {
    'lastUpdated': { 'text': 'Updated' },
    'logo': '/logo.svg',
    'nav': [
      { 'link': '/getting-started', 'text': 'Guide' },
      { 'link': '/packages/', 'text': 'Packages' },
      { 'link': SITE_REPO, 'text': 'GitHub' }
    ],
    'search': { 'provider': 'local' },
    'sidebar': {
      '/': [
        {
          'items': [
            { 'link': '/', 'text': 'Overview' },
            { 'link': '/getting-started', 'text': 'Getting Started' },
            { 'link': '/architecture', 'text': 'Architecture' },
            { 'link': '/dependency-graph', 'text': 'Dependency Graph' },
            { 'link': '/concepts/composition-contract', 'text': 'Composition Contract' },
            { 'link': '/concepts/package-registry', 'text': 'Package Registry' }
          ],
          'text': 'Introduction'
        },
        {
          'items': [
            { 'link': '/packages/', 'text': 'Packages Index' }
          ],
          'text': 'Packages'
        },
        {
          'collapsed': false,
          'items': STATEFUL.map(p => {return { 'link': `/packages/${p}`, 'text': `@studnicky/${p}` };}),
          'text': 'Stateful primitives'
        },
        {
          'collapsed': false,
          'items': STATELESS.map(p => {return { 'link': `/packages/${p}`, 'text': `@studnicky/${p}` };}),
          'text': 'Stateless utilities'
        },
        {
          'collapsed': false,
          'items': MATCHING_AND_ROUTING.map(p => {return { 'link': `/packages/${p}`, 'text': `@studnicky/${p}` };}),
          'text': 'Matching & routing'
        },
        {
          'collapsed': false,
          'items': [
            { 'link': '/eslint/', 'text': 'Overview' },
            {
              'collapsed': true,
              'items': ESLINT_CONFIG_RULES.map(r => {return { 'link': `/eslint/rules/${r}`, 'text': `@studnicky/${r}` };}),
              'text': 'Configuration rules'
            },
            {
              'collapsed': true,
              'items': ESLINT_V8_RULES.map(r => {return { 'link': `/eslint/rules/v8/${r}`, 'text': `@studnicky/v8/${r}` };}),
              'text': 'V8 performance rules'
            },
            {
              'collapsed': true,
              'items': [
                { 'link': '/eslint/known-issues/type-alias-invariants-prefer-function-type', 'text': 'Callable contract interfaces' },
                { 'link': '/eslint/known-issues/type-alias-invariants-primitive-brands', 'text': 'Branded primitives' },
                { 'link': '/eslint/known-issues/type-alias-invariants-v9.0.0', 'text': 'Consumer constraints' }
              ],
              'text': 'Known issues'
            }
          ],
          'text': 'ESLint Plugins'
        }
      ]
    },
    'siteTitle': 'Substrate',
    'socialLinks': [
      { 'icon': 'github', 'link': SITE_REPO }
    ]
  },

  'title': SITE_TITLE,

  'titleTemplate': ':title | Substrate',
  'transformPageData': function(pageData) {
    const canonical = `${SITE_URL}${pageData.relativePath.replace(/\.md$/, '')}`;
    const title = pageData.title === '' || pageData.title === undefined ? SITE_TITLE : pageData.title;
    const description = pageData.frontmatter.description as string | undefined ?? SITE_DESCRIPTION;

    (pageData.frontmatter.head as HeadConfig[] | undefined) ??= [];
    const head = pageData.frontmatter.head as HeadConfig[];
    head.push(
      ['link', { 'href': canonical, 'rel': 'canonical' }],
      ['meta', { 'content': canonical, 'property': 'og:url' }],
      ['meta', { 'content': title, 'property': 'og:title' }],
      ['meta', { 'content': description, 'property': 'og:description' }],
      ['meta', { 'content': title, 'name': 'twitter:title' }],
      ['meta', { 'content': description, 'name': 'twitter:description' }]
    );
  },

  'vite': {
    'esbuild': {
      // VitePress 1.6.4 uses Vite 5/esbuild 0.21 which does not recognise
      // the ES2024 target from tsconfig.base.json. Override via tsconfigRaw
      // to ES2022 for the docs build — the built output still targets modern
      // browsers via Vite's own build target, so no functionality is lost.
      'tsconfigRaw': {
        'compilerOptions': {
          'target': 'ES2022',
          'useDefineForClassFields': true
        }
      }
    },
    'plugins': [substrateBrowserSwap()],
    'resolve': {
      'alias': {
        // Browser shim for packages/retry and packages/throttle which import
        // named exports from node:timers/promises. Without this alias Rollup
        // fails to resolve the named export `setTimeout` from the externalized stub.
        'node:timers/promises': fileURLToPath(new URL('./shims/node-timers-promises.js', import.meta.url))
      }
    },
    'ssr': {
      'noExternal': [
        '@codemirror/commands',
        '@codemirror/lang-javascript',
        '@codemirror/language',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/highlight',
        'sucrase',
        // Bundle all workspace primitives so the playground links their source.
        /^@studnicky\//
      ]
    }
  }
}));
