# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `EntityStore<TEntity, TId>` class: a normalized, ID-indexed entity collection with `upsertOne`/`upsertMany`/`removeOne`/`removeMany`/`setAll` CRUD, O(1) lookup via an internal `Map`, and configurable iteration order via `sortComparer`. Deliberately unbounded and non-evicting — no capacity limit, no TTL, no cache-tag invalidation.
- `EntityStoreBuilder<TEntity, TId>` fluent builder, produced by `EntityStore.builder()`.
- Protected lifecycle hooks (`onUpsert`, `onRemove`, `onReplaceAll`) for subclass-level observability, following the substrate no-op hook idiom.
