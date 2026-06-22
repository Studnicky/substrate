# Changelog

## [1.0.0] - 2026-06-22

### Added
- `StateMachine` abstract base class with `transition()` wrapper and `ReducerThrewError`
- `EffectInterpreter` with async FIFO mailbox, observer subscriptions, and effect dispatch
- `MachineRegistry` module-singleton for name-based interpreter lookup
