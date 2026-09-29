---
"@studnicky/errors": major
"@studnicky/filters": major
---

Error and plugin names are declared as literals instead of read from class names, so they survive minification. `BaseError` declares `public abstract override readonly name: string`; every concrete subclass declares `public override readonly name: string = '<ClassName>'`, and a subclass of a concrete error declares its own. `Plugin` declares `protected abstract readonly namespace: string`, and `getNamespace()` returns it as the registry key; every concrete plugin declares `protected override readonly namespace: string = '<PluginName>'`. Assigning `this.name` in a subclass constructor is a type error because `name` is readonly.
