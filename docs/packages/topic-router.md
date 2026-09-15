---
title: '@studnicky/topic-router'
description: Composable pattern-based fan-out routing for topic subscriptions.
---

# @studnicky/topic-router

`TopicRouter` registers subscriptions and invokes every selected handler. A caller supplies a structural matcher, candidate source, selection policy, or any composition of those toolkit primitives.

## Install

```bash
pnpm add @studnicky/topic-router
```

## Try it

Register two subscription patterns and publish an order-created event. Every matching handler receives the same immutable envelope.

<RunnableExample src="packages/topic-router/examples/routeTopics" title="Route one topic to matching subscriptions" />

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `TopicRouter` | Registers subscriptions, resolves selected IDs, and fans out an event envelope. | `@studnicky/topic-router/node` |
| `TopicCandidateSourceInterface` | Contract for materializing candidate subscription identifiers. | `@studnicky/topic-router/interfaces` |
| `TopicEnvelopeInterface` | Immutable delivery envelope contract. | `@studnicky/topic-router/interfaces` |
| `TopicHandlerInterface` | Contract for a subscription delivery handler. | `@studnicky/topic-router/interfaces` |
| `TopicMatcherInterface` | Contract for structural topic-to-pattern matching. | `@studnicky/topic-router/interfaces` |
| `TopicPublishOptionsInterface` | Optional metadata attached to every envelope from one publish operation. | `@studnicky/topic-router/interfaces` |
| `TopicRegistrationOptionsInterface` | Optional registration identifier and subscription attributes. | `@studnicky/topic-router/interfaces` |
| `TopicRouterOptionsInterface` | Router construction options. | `@studnicky/topic-router/interfaces` |
| `TopicSelectionInterface` | Selected subscription identifier and evidence contract. | `@studnicky/topic-router/interfaces` |
| `TopicSubscriptionInterface` | Registered subscription contract. | `@studnicky/topic-router/interfaces` |

The interface contracts are also available from `@studnicky/topic-router/interfaces`.

## Observability hooks

Subclass `TopicRouter` to observe routing without adding a logger or selection policy to the base class. `onMatch(topic, ids)` fires after registered IDs resolve, `onNoMatch(topic)` fires after an empty structural match, `onPoolExhausted(topic)` fires after a candidate source has no registered IDs, and `onSelection(topic, selection)` fires before a selected handler receives its envelope. Hook failures are isolated from routing.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/topic-router)
