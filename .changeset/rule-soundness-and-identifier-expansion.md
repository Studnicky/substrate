---
'@studnicky/eslint-config': major
'@studnicky/worker-pool': major
'@studnicky/errors': major
'@studnicky/fetch': major
'@studnicky/resilience': major
'@studnicky/retry': major
'@studnicky/throttle': major
'@studnicky/timing': major
'@studnicky/batch': major
'@studnicky/json': major
'@studnicky/logger': major
'@studnicky/memoize': major
'@studnicky/pipeline': major
'@studnicky/sample-buffer': major
'@studnicky/sliding-window-limiter': major
---

Rule behaviour is now derived from measurement, and abbreviated exported identifiers are
expanded across every package.

## `@studnicky/eslint-config`

Every rule claim is now backed by evidence recorded in the rule source, and rule identity
is resolved through the TypeScript checker rather than matched on spelling.

**Rules whose premise was disproven and retargeted.** Measured at 5,000,000 elements:
`dynamic-property-access` now targets variable keys on plain objects only — literal keys
compile to the same `GetNamedProperty` bytecode as dot access, and indexed access lands in
the elements store without touching the hidden class. `memoize-array-length` keeps only its
reassignment check (memoizing measured 1.40x *slower*). `try-catch-in-loops` and
`switch-statements` keep their constraints but drop the `v8Optimization/` framing —
try/catch in a loop measures 1.007x, and delegated versus inlined 20-case switches emit
identical `SwitchOnSmiNoFeedback` bytecode. `define-property` targets redefinition and
accessor descriptors (15.8x on reads) rather than fresh definition, which produces an
identical map. `array-from-iterators` is inverted: the manual drain it implied is 7.5x
slower than `Array.from`. `max-switch-cases` splits by discriminant — dense integers get no
cap, strings cap at 6.

**Rules that were enforcing nothing.** `computed-class-properties` selected `Property`
nodes, which never occur in a class body. Four `arch/*` rules, `no-mixed-callable-shapes`,
and `descriptive-identifiers` were defined but never enabled.

**Contradictions resolved.** Well-known symbols are exempt from the computed-property
rules — `Symbol.iterator` has no non-computed spelling, so flagging it made an iterable
unimplementable. `inline-trivial-logic` exempts a function passed as a call argument: such
a callback is a deferred computation, and "inline it at the call site" would convert lazy
evaluation to eager. `lexical-this-only` permits `this` as a constructor reference in
static context while denying every escape from an instance method.

**All three autofixers are removed.** `clean-diagnostics` deleted code — its range ran from
the comment start to end-of-line, so an inline block comment took the rest of the line with
it. `type-alias-invariants` stripped `readonly`, which typechecks and therefore silently
converts an immutability guarantee into permitted mutation. `explicit-return-binding` bound
returned expressions to a `const`, stripping contextual typing. An autofixer is permitted
only where it cannot break the build or change program meaning.

**New rule** `explicit-return-binding` requires a returned operation to be bound to a
`const` first.

### Breaking for `@studnicky/eslint-config` consumers

Rule behaviour changes throughout: code that passed may now report, and vice versa. The
`require-options-object` option `minOptionals` is renamed `minimumOptionals`, and the rule
module `maxSwitchCases` is renamed `maximumSwitchCases`.

## Exported identifier expansion

Every exported symbol carrying an abbreviation is renamed, and its module filename follows,
because `single-export` requires a file's basename to match the symbol it exports. No
deprecated aliases are provided.

```
DEFAULT_BATCH_MAX_CONCURRENT   -> DEFAULT_BATCH_MAXIMUM_CONCURRENT
DomainErrorArgs                -> DomainErrorArgumentList
ValidateParams                 -> ValidateParameters
QueryParamsInterface           -> QueryParametersInterface
ValidatorFnInterface           -> ValidatorCallbackInterface
UrlUtils                       -> UrlQueryString
MAX_PIPELINING                 -> MAXIMUM_PIPELINING
MAX_DISPATCHER_CONNECTIONS     -> MAXIMUM_DISPATCHER_CONNECTIONS
ResolveMinLevel                -> ResolveMinimumLevel
NumCtxTypeEntity               -> NumberContextTypeEntity
StepCtxTypeEntity              -> StepContextTypeEntity
DlqAbortedError                -> DeadLetterQueueAbortedError
DlqClosedError                 -> DeadLetterQueueClosedError
DlqFullError                   -> DeadLetterQueueFullError
DlqEntryMetadataEntity         -> DeadLetterQueueEntryMetadataEntity
DlqEntryInterface              -> DeadLetterQueueEntryInterface
DEFAULT_MAX_RETRIES            -> DEFAULT_MAXIMUM_RETRIES
MaxRetriesExceededError        -> MaximumRetriesExceededError
PERCENTILE_MAX                 -> PERCENTILE_MAXIMUM
MIN_RETRY_DELAY_MS             -> MINIMUM_RETRY_DELAY_MS
MIN_SAMPLE_WINDOW              -> MINIMUM_SAMPLE_WINDOW
MIN_ADJUSTMENT_INTERVAL        -> MINIMUM_ADJUSTMENT_INTERVAL
MIN_CONCURRENCY_LIMIT          -> MINIMUM_CONCURRENCY_LIMIT
DEFAULT_MAX_EVENTS             -> DEFAULT_MAXIMUM_EVENTS
MAX_PRECISION                  -> MAXIMUM_PRECISION
```

Consumers importing any of these must update both the imported name and, where they
deep-import, the module path.

## `@studnicky/worker-pool` path resolution

Worker paths were built with `new URL(path, import.meta.url).pathname`, which returns the
URL-ENCODED path. Any directory containing a space resolved to a `%20` filename that does
not exist, so the worker never started and callers hung until they timed out. The package
README and public API example taught consumers the same broken pattern. All call sites now
use `fileURLToPath()`.

Consumers who copied the README example should switch to
`fileURLToPath(new URL('./worker.mjs', import.meta.url))`. The old form silently fails on
any path containing a space, which is routine on macOS.

## Security

All 17 outstanding advisories are cleared. The one reaching consumers was `undici`
8.8.0 to 8.10.0, a runtime dependency of `@studnicky/fetch` carrying one high and four
moderate advisories.
