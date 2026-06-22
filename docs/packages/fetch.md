---
title: '@studnicky/fetch'
description: Professional HTTP client with timeout, interceptors, and configured clients.
---

# @studnicky/fetch

> Professional HTTP client with timeout, interceptors, and configured clients for Node.js.

## Install

```bash
pnpm add @studnicky/fetch
```

## Usage

```typescript
import { FetchClient, RequestBuilder } from '@studnicky/fetch';

// Configured client with defaults
const client = new FetchClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000
});

const data = await client.get('/users/123');

// Fluent request builder
const response = await new RequestBuilder('https://api.example.com/data')
  .method('POST')
  .header('Content-Type', 'application/json')
  .body({ name: 'Alice' })
  .timeout(5000)
  .send();
```

### Interceptors

```typescript
import { InterceptorManager } from '@studnicky/fetch';

const manager = new InterceptorManager();

manager.addRequest(async (req) => {
  req.headers.set('Authorization', `Bearer ${getToken()}`);
  return req;
});

manager.addResponse(async (res) => {
  if (res.status === 401) refreshToken();
  return res;
});
```

### URL utilities

```typescript
import { UrlUtils } from '@studnicky/fetch';

const url = UrlUtils.buildQuery('https://api.example.com/search', {
  q: 'typescript',
  page: 1
});
// https://api.example.com/search?q=typescript&page=1
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/fetch` | `FetchClient`, `HttpMethods`, `InterceptorManager`, `RequestBuilder`, `UndiciDispatcher`, `UrlUtils`, all error classes |
| `@studnicky/fetch/constants` | `DefaultDispatcherConfig` |
| `@studnicky/fetch/errors` | `HTTPError`, `TimeoutError`, `NetworkError`, `AbortError`, and more |
| `@studnicky/fetch/interfaces` | All interface types |
| `@studnicky/fetch/modules` | Module re-exports |
| `@studnicky/fetch/types` | `QueryParamsType`, `RequestInterceptorType`, `ResponseInterceptorType` |

## Extending

`FetchClient` exposes protected lifecycle hooks for request and response:

```typescript
import { FetchClient } from '@studnicky/fetch';

class TrackedClient extends FetchClient {
  protected override onRequestStart(method: string, path: string, requestId: string, url: string): void {
    metrics.increment('http.request', { method });
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    metrics.timing('http.duration', durationMs, { status: statusCode });
  }

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    metrics.increment('http.error', { method });
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fetch)
