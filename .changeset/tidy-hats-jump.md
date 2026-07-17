---
"@studnicky/eslint-config": patch
---

Pin `vite` to `^6.4.3` and `esbuild` to `^0.25.0` via a root `pnpm.overrides` entry, resolving four Dependabot alerts in the transitive `vitepress` docs-build toolchain: `vite`'s `server.fs.deny` bypass on Windows alternate paths, a path-traversal issue in optimized-deps `.map` handling, a `launch-editor` NTLMv2 hash disclosure via UNC paths, and an `esbuild` dev-server request/response exposure. Dev-only tooling change; no published package's runtime code is affected.
