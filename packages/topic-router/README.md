# @studnicky/topic-router

> Composable topic-subscription registration and selected-ID fan-out.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/topic-router)

`TopicRouter` owns a subscription registry, resolution of registered IDs, immutable delivery envelopes, and fan-out. It does not select an algorithm, score a candidate, require a cascade, or impose an eligibility policy. Supply a matcher or candidate source from `@studnicky/matching`, then compose any selection policy outside the router.

This package is not an HTTP or RPC router. It delivers every selected subscription for one topic; request routing selects one primary handler.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/topic-router
```

## Usage

```ts
import { TreeMatcher } from '@studnicky/matching';
import { TopicRouter } from '@studnicky/topic-router';

const candidates = new TreeMatcher();
candidates.register('audit', 'api.**');

const router = TopicRouter.create<string>({ 'candidateSource': candidates });
router.register('api.**', async (envelope) => {
  console.log(envelope.topic, envelope.payload);
}, { 'id': 'audit' });

await router.publish('api.v1.users', 'created');
```

Use `publishSelected(topic, payload, selections)` when a builder has already selected stable subscription IDs through a filter, scorer, search index, or application policy. The router invokes those IDs without matching their patterns again.

Subclass `TopicRouter` to override `onMatch`, `onNoMatch`, `onPoolExhausted`, or `onSelection` for metrics and tracing. Hook failures are isolated from delivery.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/topic-router

## License

MIT
