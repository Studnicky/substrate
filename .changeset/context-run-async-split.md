---
"@studnicky/context": major
---

`Context.run` accepts only a synchronous operation and returns `ContextRunResultInterface<TResult>` directly. `Context.runAsync` accepts an asynchronous operation and returns `Promise<ContextRunResultInterface<TResult>>`. The prior single `run` overload set let the implementation's declared return type outrun what the compiler could verify for either the sync or async branch; each method now has one signature the compiler checks against its own body.
