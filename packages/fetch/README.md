# @studnicky/fetch

> Professional HTTP client with timeout, interceptors, and configured clients for Node.js

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/fetch)

`@studnicky/fetch` wraps the native `fetch` API with a configured client and direct HTTP verb methods. Timeout, abort, body serialization, and dispatcher behavior all use the same request path. Observable behavior such as telemetry, logging, and tracing is added through lifecycle hooks.

`@studnicky/fetch` is the sole public code entrypoint.

`FetchClient` owns an enabled connection-pool Agent internally. Direct `UndiciDispatcher` use accepts a caller-owned `undici` `Agent`; retain that Agent for request dispatch and use `UndiciDispatcher` for health checks and lifecycle management.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/fetch
```

## Usage

```typescript
import { FetchClient } from '@studnicky/fetch';

const api = FetchClient.create({
  baseURL: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
  timeout: 5000
});

const response = await api.get('/users?page=1&limit=20', {
  headers: { 'X-Request-Source': 'dashboard' }
});

const users = await response.json();
```

## Extending

`FetchClient` provides three protected hook points that subclasses override to add telemetry. The base class hooks are no-ops — all observability is supplied by the subclass:

```typescript
import { FetchClient } from '@studnicky/fetch';

class TracedClient extends FetchClient {
  protected override onRequestStart(method: string, path: string, requestId: string, url: string): void {
    console.log(`[${requestId}] ${method} ${url}`);
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    console.log(`[${requestId}] ${statusCode} in ${durationMs}ms`);
  }

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    console.error(`[${requestId}] ${method} ${url} failed after ${durationMs}ms`, error);
  }
}

const api = TracedClient.create({ baseURL: 'https://api.example.com' });
```

`FetchRequestOptionsEntity` owns the schema-expressible request fields shared by `FetchOptionsInterface` and `BodyRequestOptionsInterface`. `ClientConfigDataEntity` owns the schema-expressible client settings. The interfaces compose those entity fields with runtime-only values such as headers, signals, dispatchers, metadata, and request-ID generators.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/fetch

## License

MIT
