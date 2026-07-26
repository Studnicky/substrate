---
"@studnicky/system": patch
---

### Fixed

- `GpuDetector.detect()` resolves the ambient browser `document` through a type-guarded `Reflect.get(globalThis, 'document')` lookup and calls `createElement` on the resolved object itself, so the method keeps its receiver. The browser surface it reads — `document.createElement('canvas')`, the WebGL context, and the `WEBGL_debug_renderer_info` extension — is declared structurally, because the package compiles against `ESNext` alone and no DOM lib types are available to name.
