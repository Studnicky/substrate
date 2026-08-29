import { HookInvoker } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { TopicCandidateSourceInterface } from './interfaces/TopicCandidateSourceInterface.js';
import type { TopicEnvelopeInterface } from './interfaces/TopicEnvelopeInterface.js';
import type { TopicMatcherInterface } from './interfaces/TopicMatcherInterface.js';
import type { TopicRegistrationOptionsInterface } from './interfaces/TopicRegistrationOptionsInterface.js';
import type { TopicRouterOptionsInterface } from './interfaces/TopicRouterOptionsInterface.js';
import type { TopicSelectionInterface } from './interfaces/TopicSelectionInterface.js';
import type { TopicSubscriptionInterface } from './interfaces/TopicSubscriptionInterface.js';

class TopicRouterHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

export class TopicRouter<TPayload> {
  protected readonly hooks = new TopicRouterHookInvoker();
  readonly #candidateSource: TopicCandidateSourceInterface | undefined;
  readonly #matcher: TopicMatcherInterface | undefined;
  readonly #subscriptions = new Map<string, TopicSubscriptionInterface<TPayload>>();

  static create<TPayload>(options: TopicRouterOptionsInterface): TopicRouter<TPayload> {
    const result = new TopicRouter<TPayload>(options);
    return result;
  }

  protected constructor(options: TopicRouterOptionsInterface) {
    if (options.matcher === undefined && options.candidateSource === undefined) {
      throw new TypeError('TopicRouter requires a matcher or candidate source.');
    }
    this.#candidateSource = options.candidateSource;
    this.#matcher = options.matcher;
  }

  match(topic: string): readonly string[] {
    TopicRouter.assertTopic(topic);
    if (this.#candidateSource !== undefined) {
      const result = this.#candidateSource.candidates(topic).filter((id): boolean => {
        const isRegistered = this.#subscriptions.has(id);
        return isRegistered;
      });
      if (result.length === 0) {
        this.hooks.invoke('onPoolExhausted', () => { const hookResult = this.onPoolExhausted(topic); return hookResult; });
      } else {
        this.hooks.invoke('onMatch', () => { const hookResult = this.onMatch(topic, result); return hookResult; });
      }
      return result;
    }
    const result: string[] = [];
    for (const subscription of this.#subscriptions.values()) {
      if (this.#matcher?.matches(subscription.pattern, topic) === true) {
        result.push(subscription.id);
      }
    }
    if (result.length === 0) {
      this.hooks.invoke('onNoMatch', () => { const hookResult = this.onNoMatch(topic); return hookResult; });
    } else {
      this.hooks.invoke('onMatch', () => { const hookResult = this.onMatch(topic, result); return hookResult; });
    }
    return result;
  }

  async publish(topic: string, payload: TPayload, metadata: unknown = undefined): Promise<readonly string[]> {
    const ids = this.match(topic);
    const selections = ids.map((id): TopicSelectionInterface => { return { 'id': id, 'origin': 'matcher' }; });
    const result = await this.publishSelected(topic, payload, selections, metadata);
    return result;
  }

  async publishSelected(topic: string, payload: TPayload, selections: readonly TopicSelectionInterface[], metadata: unknown = undefined): Promise<readonly string[]> {
    TopicRouter.assertTopic(topic);
    const delivered: string[] = [];
    const visited = new Set<string>();
    for (let index = 0; index < selections.length; index += 1) {
      const selection = selections[index];
      if (selection === undefined) {
        continue;
      }
      TopicRouter.assertSelection(selection);
      if (visited.has(selection.id)) {
        continue;
      }
      visited.add(selection.id);
      const subscription = this.#subscriptions.get(selection.id);
      if (subscription === undefined) {
        continue;
      }
      await this.hooks.invokeAsync('onSelection', () => { const result = this.onSelection(topic, selection); return result; });
      const envelope: TopicEnvelopeInterface<TPayload> = Object.freeze({
        'metadata': metadata,
        'payload': payload,
        'selection': Object.freeze({ 'origin': selection.origin, 'scores': Object.freeze({ ...selection.scores }) }),
        'subscription': Object.freeze({ 'attributes': subscription.attributes, 'id': subscription.id, 'pattern': subscription.pattern }),
        'topic': topic
      });
      await subscription.handler(envelope);
      delivered.push(subscription.id);
    }
    return delivered;
  }

  register(pattern: string, handler: TopicSubscriptionInterface<TPayload>['handler'], options: TopicRegistrationOptionsInterface = {}): string {
    TopicRouter.assertTopic(pattern);
    if (!Predicates.isFunction(handler)) {
      throw new TypeError('Subscription handler must be a function.');
    }
    const id = options.id ?? globalThis.crypto.randomUUID();
    TopicRouter.assertTopic(id);
    if (this.#subscriptions.has(id)) {
      throw new Error(`Subscription already exists: ${id}`);
    }
    const subscription = Object.freeze({ 'attributes': options.attributes, 'handler': handler, 'id': id, 'pattern': pattern });
    this.#subscriptions.set(id, subscription);
    return id;
  }

  unregister(id: string): boolean {
    const result = this.#subscriptions.delete(id);
    return result;
  }

  /** Fires after a matcher or candidate source resolves registered subscription identifiers. */
  protected onMatch(_topic: string, _ids: readonly string[]): void | Promise<void> {}

  /** Fires when a structural matcher resolves no subscription identifiers. */
  protected onNoMatch(_topic: string): void | Promise<void> {}

  /** Fires when a candidate source resolves no registered identifiers. */
  protected onPoolExhausted(_topic: string): void | Promise<void> {}

  /** Fires before one selected subscription receives its envelope. */
  protected onSelection(_topic: string, _selection: TopicSelectionInterface): void | Promise<void> {}

  private static assertSelection(selection: TopicSelectionInterface): void {
    TopicRouter.assertTopic(selection.id);
    TopicRouter.assertTopic(selection.origin);
    if (selection.scores === undefined) {
      return;
    }
    if (!Predicates.isRecord(selection.scores)) {
      throw new TypeError('Selection scores must be a record.');
    }
    const scores = Object.values(selection.scores);
    for (let index = 0; index < scores.length; index += 1) {
      const score = scores[index];
      if (!Predicates.isFiniteNumber(score)) {
        throw new TypeError('Selection scores must be finite numbers.');
      }
    }
  }

  private static assertTopic(value: string): void {
    if (!Predicates.isString(value) || value.length === 0) {
      throw new TypeError('Topic values must be non-empty strings.');
    }
  }
}
