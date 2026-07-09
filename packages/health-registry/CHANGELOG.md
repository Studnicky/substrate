# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `HealthRegistry` class: named async health-check registry via `register()`/`unregister()`/`has()`/`list()`/`evaluate()`, aggregating every check into one overall `'healthy' | 'degraded' | 'unhealthy'` status.
- `evaluate()` runs all registered checks in parallel via `Promise.allSettled`, applies each check's own `timeoutMs` (composed via `@studnicky/signal`), and folds a rejecting or timed-out check into the results as `'unhealthy'` instead of crashing the evaluation of the others.
- Protected observability hooks `onCheckRegistered`, `onCheckResult`, `onCheckTimeout`, and `onAggregate` for logging/tracing/metrics via subclassing.
- `HealthCheckOptionsType`, `HealthCheckResultType`, `HealthCheckType`, `HealthEvaluationType`, and `HealthStatusType` exported types.
