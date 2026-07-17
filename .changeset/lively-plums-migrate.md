---
"@studnicky/types": minor
"@studnicky/errors": minor
"@studnicky/logger": minor
---

`@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

`@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`/`message`/`retryable`/`cause`/`correlationId`/`metadata` for a `super()` call so leaf error classes can skip the manual field-assignment ceremony while keeping their `extends` chain and `instanceof` checks intact.

`@studnicky/logger` exports `ResolveMinLevel.from(options)`, the level-validation-and-resolution logic `ConsoleTransport`/`MemoryTransport` already use internally, now reusable by third-party `TransportInterface` implementations.
