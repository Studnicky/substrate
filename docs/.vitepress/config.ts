import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as {
  substrate?: { seo?: { googleSiteVerification?: string; bingSiteVerification?: string; twitterHandle?: string } };
};

const SITE_TITLE = 'Substrate';
const SITE_TAGLINE = 'Subclass-first TypeScript primitives.';
const SITE_DESCRIPTION = 'A subclass-first toolkit of TypeScript primitives — retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base.';
const SITE_URL = 'https://studnicky.github.io/substrate/';
const SITE_BASE = '/substrate/';
const SITE_OG_IMAGE = `${SITE_URL}og-image.svg`;
const SITE_THEME_COLOR = '#14b8a6';
const SITE_KEYWORDS = 'typescript,subclass,primitives,retry,throttle,mutex,scheduler,clock,async-context,pipeline,logger,errors,json,monorepo,esm,node,fsm,lifecycle-hooks,dependency-injection,circular-buffer,batch,timing,types,config,fetch,cache,concurrency,event-bus,file-lock,predicates,resilience,signal,system,abort-signal,circuit-breaker,token-bucket,dead-letter-queue';
const SITE_AUTHOR_NAME = 'Andrew Studnicky';
const SITE_AUTHOR_URL = 'https://github.com/Studnicky';
const SITE_REPO = 'https://github.com/Studnicky/substrate';
const SITE_LOGO = `${SITE_URL}logo.svg`;

const seo = pkg.substrate?.seo ?? {};
const googleVerify = seo.googleSiteVerification ?? '';
const bingVerify = seo.bingSiteVerification ?? '';
const twitterHandle = seo.twitterHandle ?? '';

const PACKAGES = [
  'batch', 'cache', 'circular-buffer', 'clock', 'concurrency', 'config',
  'context', 'errors', 'eslint-config', 'event-bus', 'fetch', 'file-lock',
  'fsm', 'json', 'logger', 'mutex', 'pipeline', 'predicates', 'resilience',
  'retry', 'sample-buffer', 'scheduler', 'signal', 'system', 'throttle',
  'timing', 'types'
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
  author: { '@type': 'Person', name: SITE_AUTHOR_NAME, url: SITE_AUTHOR_URL }
});

export default withMermaid(defineConfig({
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
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
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
          text: 'Packages',
          items: [
            { text: 'Packages Index', link: '/packages/' },
            ...PACKAGES.map(pkg => ({ text: `@studnicky/${pkg}`, link: `/packages/${pkg}` }))
          ]
        }
      ]
    }
  },

  mermaid: { theme: 'dark' },

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
