---
"@studnicky/types": patch
---

Removes the `shell-quote` and `source-map-js` entries from `pnpm.overrides`: both already resolve to their patched versions through the existing dependency tree's own declared ranges (`launch-editor`'s `^1.10.0` and `@vue/compiler-core`'s `^1.2.1`), so forcing them was unnecessary. Keeps the `katex` override, which genuinely exceeds what `mermaid`/`@mermaid-js/mermaid-cli` currently declare support for — no newer release of either exists yet.
