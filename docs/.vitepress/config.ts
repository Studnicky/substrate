import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as {
  substrate?: { seo?: { googleSiteVerification?: string; bingSiteVerification?: string; twitterHandle?: string } };
};

// Node-only source modules in otherwise-isomorphic packages, mapped to their
// browser siblings. The docs playground bundles package SOURCE (not the built
// dist), so the packages' own `"browser"` export-field swaps never engage —
// this plugin performs the equivalent redirect for the CLIENT bundle only.
const BROWSER_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ['packages/system/src/providers/SystemProvider', 'packages/system/src/providers/browser/SystemProvider'],
  ['packages/system/src/modules/GpuDetector', 'packages/system/src/modules/browser/GpuDetector'],
  ['packages/file-lock/src/NodeFileSystem', 'packages/file-lock/src/browser/NodeFileSystem'],
  ['packages/file-lock/src/NodeOwnerToken', 'packages/file-lock/src/browser/NodeOwnerToken']
];

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

type ResolveOptionsType = Record<string, unknown> & { readonly ssr?: boolean };

interface ResolvedIdInterface {
  readonly id: string;
}

interface PluginContextInterface {
  resolve(
    source: string,
    importer: string,
    options: Record<string, unknown>
  ): Promise<ResolvedIdInterface | null>;
}

const substrateBrowserSwap = (): {
  name: string;
  enforce: 'pre';
  resolveId: (this: PluginContextInterface, source: string, importer: string | undefined, options?: ResolveOptionsType) => Promise<string | null>;
} => {
  return {
    name: 'substrate-browser-swap',
    enforce: 'pre',
    resolveId: async function (this: PluginContextInterface, source: string, importer: string | undefined, options?: ResolveOptionsType): Promise<string | null> {
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
const SITE_TAGLINE = 'Subclass-first TypeScript primitives.';
const SITE_DESCRIPTION = 'A subclass-first toolkit of TypeScript primitives: retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base.';
const SITE_URL = 'https://studnicky.github.io/substrate/';
const SITE_BASE = '/substrate/';
const SITE_OG_IMAGE = `${SITE_URL}og-image.png`;
const SITE_THEME_COLOR = '#7c5aed';
const SITE_KEYWORDS = 'typescript,subclass,primitives,retry,throttle,mutex,scheduler,clock,async-context,pipeline,logger,errors,json,monorepo,esm,node,fsm,lifecycle-hooks,dependency-injection,circular-buffer,batch,timing,types,config,fetch,cache,concurrency,event-bus,file-lock,predicates,resilience,signal,system,abort-signal,circuit-breaker,token-bucket,dead-letter-queue';
const SITE_AUTHOR_NAME = 'Andrew Studnicky';
const SITE_AUTHOR_URL = 'https://github.com/Studnicky';
const SITE_REPO = 'https://github.com/Studnicky/substrate';
const SITE_LOGO = `${SITE_URL}og-image.png`;

const seo = pkg.substrate?.seo ?? {};
const googleVerify = seo.googleSiteVerification ?? '';
const bingVerify = seo.bingSiteVerification ?? '';
const twitterHandle = seo.twitterHandle ?? '';

const ESLINT_CONFIG_RULES = [
  'entity-namespace', 'interface-must-be-contract', 'no-bind-apply-call',
  'no-export-alias', 'no-freestanding-verb-noun', 'no-prefer-existing-type',
  'no-suppression-comments', 'no-this-alias', 'no-trivial-shim',
  'no-type-aliasing', 'prefer-collection-types', 'require-options-object',
  'single-export', 'type-alias-must-end-type'
] as const;

const ESLINT_V8_RULES = [
  'arguments-object', 'array-from-iterators', 'computed-class-properties',
  'computed-object-properties', 'define-property', 'delete-property',
  'eval-function', 'for-in-loops', 'for-of-arrays', 'no-concat-in-loops',
  'no-spread-in-loops', 'prototype-modification', 'regexp-in-loops',
  'switch-statements', 'try-catch-in-loops', 'with-statement'
] as const;

const STATEFUL = [
  'batch', 'cache', 'circular-buffer', 'clock', 'concurrency', 'context',
  'event-bus', 'file-lock', 'fsm', 'logger', 'mutex', 'pipeline', 'resilience',
  'retry', 'sample-buffer', 'scheduler', 'throttle', 'timing', 'virtual-fs'
] as const;

const STATELESS = [
  'config', 'errors', 'eslint-config', 'fetch', 'json', 'predicates',
  'signal', 'system', 'types'
] as const;

type HeadConfig = [string, Record<string, string>] | [string, Record<string, string>, string];

const conditionalHead: HeadConfig[] = [
  ...(googleVerify ? [['meta', { name: 'google-site-verification', content: googleVerify }] as HeadConfig] : []),
  ...(bingVerify ? [['meta', { name: 'msvalidate.01', content: bingVerify }] as HeadConfig] : []),
  ...(twitterHandle ? [['meta', { name: 'twitter:site', content: `@${twitterHandle}` }] as HeadConfig] : []),
  ...(twitterHandle ? [['meta', { name: 'twitter:creator', content: `@${twitterHandle}` }] as HeadConfig] : []),
];

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: SITE_TITLE,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  license: 'MIT',
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'Node.js',
  codeRepository: SITE_REPO,
  author: { '@type': 'Person', name: SITE_AUTHOR_NAME, url: SITE_AUTHOR_URL },
  image: SITE_LOGO
});

export default withMermaid(defineConfig({
  vite: {
    plugins: [substrateBrowserSwap()],
    esbuild: {
      // VitePress 1.6.4 uses Vite 5/esbuild 0.21 which does not recognise
      // the ES2024 target from tsconfig.base.json. Override via tsconfigRaw
      // to ES2022 for the docs build — the built output still targets modern
      // browsers via Vite's own build target, so no functionality is lost.
      tsconfigRaw: {
        compilerOptions: {
          target: 'ES2022',
          useDefineForClassFields: true
        }
      }
    },
    resolve: {
      alias: {
        // Browser shim for packages/retry and packages/throttle which import
        // named exports from node:timers/promises. Without this alias Rollup
        // fails to resolve the named export `setTimeout` from the externalized stub.
        'node:timers/promises': fileURLToPath(new URL('./shims/node-timers-promises.js', import.meta.url))
      }
    },
    ssr: {
      noExternal: [
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
  },
  base: SITE_BASE,
  lang: 'en-US',
  title: SITE_TITLE,
  titleTemplate: ':title | Substrate',
  description: SITE_DESCRIPTION,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: SITE_URL },
  appearance: true,

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: `${SITE_BASE}favicon.ico` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${SITE_BASE}icon-32.png` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: `${SITE_BASE}icon-16.png` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${SITE_BASE}apple-touch-icon.png` }],
    ['link', { rel: 'manifest', href: `${SITE_BASE}manifest.webmanifest` }],
    ['meta', { name: 'theme-color', content: SITE_THEME_COLOR }],
    ['meta', { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' }],
    ['meta', { name: 'author', content: SITE_AUTHOR_NAME }],
    ['meta', { name: 'keywords', content: SITE_KEYWORDS }],
    ['meta', { name: 'application-name', content: 'Substrate' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_TITLE }],
    ['meta', { property: 'og:title', content: SITE_TITLE }],
    ['meta', { property: 'og:description', content: SITE_DESCRIPTION }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:image', content: SITE_OG_IMAGE }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:secure_url', content: SITE_OG_IMAGE }],
    ['meta', { property: 'og:image:alt', content: SITE_TITLE }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: SITE_TITLE }],
    ['meta', { name: 'twitter:description', content: SITE_DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: SITE_OG_IMAGE }],
    ...conditionalHead,
    ['script', { type: 'application/ld+json' }, jsonLd],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Substrate',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Lifecycle Hooks', link: '/concepts/lifecycle-hooks' },
      { text: 'Packages', link: '/packages/' },
      { text: 'GitHub', link: SITE_REPO }
    ],
    socialLinks: [
      { icon: 'github', link: SITE_REPO }
    ],
    search: { provider: 'local' },
    lastUpdated: { text: 'Updated' },
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Architecture', link: '/architecture' }
          ]
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Lifecycle Hooks', link: '/concepts/lifecycle-hooks' }
          ]
        },
        {
          text: 'Packages',
          items: [
            { text: 'Packages Index', link: '/packages/' }
          ]
        },
        {
          text: 'Stateful primitives',
          collapsed: false,
          items: STATEFUL.map(p => ({ text: `@studnicky/${p}`, link: `/packages/${p}` }))
        },
        {
          text: 'Stateless utilities',
          collapsed: false,
          items: STATELESS.map(p => ({ text: `@studnicky/${p}`, link: `/packages/${p}` }))
        },
        {
          text: 'ESLint Plugins',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/eslint/' },
            {
              text: 'Configuration rules',
              collapsed: true,
              items: ESLINT_CONFIG_RULES.map(r => ({ text: `@studnicky/${r}`, link: `/eslint/rules/${r}` }))
            },
            {
              text: 'V8 performance rules',
              collapsed: true,
              items: ESLINT_V8_RULES.map(r => ({ text: `@studnicky/v8/${r}`, link: `/eslint/rules/v8/${r}` }))
            }
          ]
        }
      ]
    }
  },

  mermaid: {
    theme: 'base',
    themeVariables: {
      fontFamily: 'var(--vp-font-family-mono)',
      background: '#ffffff',
      primaryColor: '#f5f3ff',
      primaryTextColor: '#2e1065',
      primaryBorderColor: '#7c5aed',
      lineColor: '#94a3b8',
      textColor: '#334155',
      secondaryColor: '#faf5ff',
      tertiaryColor: '#f8fafc'
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      nodeSpacing: 28,
      rankSpacing: 44
    }
  },
  mermaidPlugin: { class: 'mermaid substrate-mermaid' },

  transformPageData(pageData) {
    const canonical = `${SITE_URL}${pageData.relativePath.replace(/\.md$/, '')}`;
    const title = pageData.title ?? SITE_TITLE;
    const description = pageData.frontmatter['description'] as string | undefined ?? SITE_DESCRIPTION;

    (pageData.frontmatter['head'] as HeadConfig[] | undefined) ??= [];
    const head = pageData.frontmatter['head'] as HeadConfig[];
    head.push(
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }]
    );
  }
}));
