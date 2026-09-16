# @studnicky/retry

> Retry asynchronous operations with explicit classification, backoff, and typed lifecycle events.

[Package guide](https://studnicky.github.io/substrate/packages/retry)

## Install

Packages publish to GitHub Packages. Add this to .npmrc:

~~~
@studnicky:registry=https://npm.pkg.github.com
~~~

~~~sh
pnpm add @studnicky/retry @studnicky/event-bus
~~~

## Retry an operation

~~~typescript
import { DefaultHttpErrorClassifier } from '@studnicky/errors/node';
import { BackoffStrategy, Retry } from '@studnicky/retry/node';

const retry = Retry.create({
  'backoffStrategy': { 'baseDelayMs': 100, 'strategy': BackoffStrategy.exponential },
  'errorClassifier': DefaultHttpErrorClassifier.create(),
  'maximumRetries': 3
});

const response = await retry.execute(() => fetch('https://api.example.com/data'));
~~~

## Publish lifecycle events

Pass an EventSinkInterface to eventSink for basic telemetry. EventBus satisfies the interface directly; any publisher with the same typed publish method also works.

~~~typescript
import type { RetryEventTopicMapInterface } from '@studnicky/retry/interfaces';

import { EventBus } from '@studnicky/event-bus/node';
import { Retry } from '@studnicky/retry/node';

const bus = EventBus.create<RetryEventTopicMapInterface>();
bus.subscribe('retryScheduled', async (event) => {
  console.log(event.attemptNumber, event.delayMs);
});

const retry = Retry.create({ 'eventSink': bus });
~~~

Retry publishes these topics in lifecycle order:

| Topic | Snapshot |
|---|---|
| attempt | Attempt number and elapsed time. |
| retryScheduled | Final attempt, delay, elapsed-time, and abort values after the scheduling hook runs. |
| success | Successful attempt number and elapsed time. |

Every payload is a detached, frozen JSON snapshot. Event delivery is advisory: a rejected or slow sink never changes the operation result, terminal error, retry count, delay, or abort decision.

## Control retry behavior

Use configuration for standard backoff. Override onRetryScheduled only when the application must alter the next retry directly, such as setting delayMs from domain state or setting abort to true. Override classifyError when the default classifier does not model the domain failure.

~~~typescript
import type { RetryContextInterface } from '@studnicky/retry/interfaces';

import { Retry } from '@studnicky/retry/node';

class DatabaseRetry extends Retry {
  protected override onRetryScheduled(context: RetryContextInterface): void {
    context.delayMs = 250;
  }
}
~~~

## Imports

| Surface | Import path |
|---|---|
| Node runtime APIs | @studnicky/retry/node |
| Browser runtime APIs | @studnicky/retry/browser |
| Schema entities | @studnicky/retry/entities |
| Type contracts | @studnicky/retry/interfaces |

## Documentation

Full consumer guide: https://studnicky.github.io/substrate/packages/retry

## License

MIT
