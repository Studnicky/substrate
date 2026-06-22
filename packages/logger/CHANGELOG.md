# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- Pluggable `LoggerInterface` with five implementations: `PinoLogger`, `ConsoleLogger`, `FanOutLogger`, `NoOpLogger`, and `SpyLogger`
- Fluent `LogBody` and `LogFault` builders that enforce required fields (`component`, `operation`, `status`, `message`, `context`) at build time
- Child loggers via `.child(metadata)` for correlation ID injection from async context
- `SpyLogger` capture buffer (`entries`, `flush`, `clear`) for test assertion without output side-effects
