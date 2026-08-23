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

## `@studnicky/predicates` removes `satisfiesConst`

`Predicates.satisfiesConst` is removed. It forwarded 1:1 to `DataType.deepEqual` and added no
behaviour of its own — the JSON Schema `const` keyword IS deep equality.

Consumers call `DataType.deepEqual(value, constantValue)` from `@studnicky/json` directly, which
requires declaring `@studnicky/json` as a dependency; `@studnicky/predicates` does not re-export
it. The semantics are unchanged, and `@studnicky/json` already owns the tests for them.

The rest of the `satisfies*` family — `satisfiesEnum`, `satisfiesMinimum`, `satisfiesContains`
and the others — is unaffected. Each of those applies logic of its own beyond a forward.

## `@studnicky/errors` cause installation

`BaseError` installs an own `cause` property only when a cause is actually supplied. `Error`
installs `cause` whenever the options object HAS the key, regardless of its value, so passing
`{ 'cause': undefined }` created an own `cause` holding `undefined`. Both spellings leave
`error.cause === undefined` and no consumer can read them apart, but the first forced any
subclass wanting a cause-free instance to `delete` the property — which drops every instance of
that subclass into dictionary mode.

Measured at 2,000,000 instances: the deletion costs 7.2x on property reads (300.6ms against
41.8ms) and `%HasFastProperties` reports false. Constructing the options object conditionally
splits the error family into two hidden classes, which measures free (13.8ms bimorphic against
15.2ms monomorphic) because inline caches stay polymorphic well past two shapes.

`RetryError` consequently drops its `Reflect.deleteProperty(this, 'cause')`, keeping its
detached-projection contract with no property to remove.

Consumers reading `error.cause` are unaffected. Code testing for the property's PRESENCE —
`'cause' in error` or `Object.hasOwn(error, 'cause')` — now reports `false` on an error
constructed without a cause, where it previously reported `true`.

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

`pnpm.overrides` carries one entry where it previously carried seven. An override applies to
every resolution in the graph regardless of what a dependent declares, so it is kept only where
no dependency bump reaches the fix. Six were removed after verifying, against GitHub's advisory
database at the exact version natural resolution selects, that each resolves clean without the
pin: `brace-expansion` 5.0.9, `dompurify` 3.4.14, `fast-uri` 3.1.6, `nanoid` 3.3.18, `postcss`
8.5.26, and `esbuild`.

The `esbuild` pin was also incorrect. `tsx` declares `~0.28.0`, and the unconditional override
served it 0.25.12 — three minors below its own declared floor, in the loader the whole test
suite runs under. Both `tsx` and `vite` now resolve inside their declared ranges.

`vite: ^6.4.3` remains, and `SECURITY.md` records why: `vitepress` 1.6.4 is the latest stable
release, it declares `vite: ^5.4.14`, and the vite 5.x line carries an unfixed HIGH
(GHSA-fx2h-pf6j-xcff) whose fix ships only in 6.4.3. None of this affects published package
contents — the toolchain is a docs-build devDependency.
