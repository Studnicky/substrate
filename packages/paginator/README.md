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

const paginator = Paginator.create<readonly string[], number>();

paginator.next(['first page'], { exhausted: false, cursor: 2 });
paginator.next(['last page'], { exhausted: true });

console.log(paginator.pages);
```

The second argument to `next()` is deliberately discriminated. `{ exhausted: false, cursor }` records another available page, while `{ exhausted: true }` records source exhaustion. A missing or bare cursor does not stand in for exhaustion, so cursor domains may legitimately include `undefined`.

The `pages` getter returns a defensive snapshot in receipt order.

## Extending

Subclass `Paginator` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library. The hooks fire around every state transition.

```typescript
import type {
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '@studnicky/paginator';

import { Paginator } from '@studnicky/paginator';

class InstrumentedPaginator<TPage, TCursor> extends Paginator<TPage, TCursor> {
  static tracked<TPage, TCursor>(): InstrumentedPaginator<TPage, TCursor> {
    return new InstrumentedPaginator<TPage, TCursor>();
  }

  protected override onTransition(
    from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type
    | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): void {
    metrics.increment('paginator.transition', { 'from': from.variant, 'to': to.variant, 'event': event.type });
  }
}

const paginator = InstrumentedPaginator.tracked<string, number>();
```

Available hooks: `onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`.

Pure discriminant-only shapes are exported as entity-derived types. Generic shapes that compose page or cursor values are exported as interfaces, preserving discriminant narrowing without broad optional fields.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/paginator

## License

MIT
