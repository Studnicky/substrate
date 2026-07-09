# @studnicky/paginator

> Cursor/page-list state tracker for paginated data sources

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/paginator)

Tracks the pages received from a paginated data source and the cursor for the next page. It does not fetch data — the caller supplies each fetched page, and `Paginator` only tracks what pages have been received, the cursor for the next page, and whether more pages are expected.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/paginator
```

## Usage

```typescript
import { Paginator } from '@studnicky/paginator';

const paginator = Paginator.create<string, number>();

while (paginator.hasNext()) {
  const { page, nextCursor } = await fetchPage(paginator.pages.length);

  paginator.next(page, nextCursor);
}

console.log(paginator.pages);
```

## Extending

Subclass `Paginator` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library. The hooks fire around every state transition.

```typescript
import type { PaginatorEventType, PaginatorStateType } from '@studnicky/paginator';

import { Paginator } from '@studnicky/paginator';

class InstrumentedPaginator<TPage, TCursor> extends Paginator<TPage, TCursor> {
  static tracked<TPage, TCursor>(): InstrumentedPaginator<TPage, TCursor> {
    return new InstrumentedPaginator<TPage, TCursor>();
  }

  protected override onTransition(
    from: PaginatorStateType<TPage, TCursor>,
    to: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>
  ): void {
    metrics.increment('paginator.transition', { 'from': from.variant, 'to': to.variant, 'event': event.type });
  }
}

const paginator = InstrumentedPaginator.tracked<string, number>();
```

Available hooks: `onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/paginator

## License

MIT
