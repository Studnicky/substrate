<script setup lang="ts">
import { withBase } from 'vitepress';

interface Pkg {
  name: string;
  link: string;
  desc: string;
  icon: string;
}
interface Subgroup {
  title: string;
  packages: Pkg[];
}
interface Group {
  title: string;
  packages?: Pkg[];
  subgroups?: Subgroup[];
}

const ICON_CONFIG_RULE = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m576-160-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104 104 104-56 56-104-104-104 104Zm79-360L513-662l56-56 85 85 170-170 56 57-225 226ZM80-280v-80h360v80H80Zm0-320v-80h360v80H80Z"/></svg>`;
const ICON_V8_RULE = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M360-840v-80h240v80H360Zm80 440h80v-240h-80v240Zm40 320q-74 0-139.5-28.5T226-186q-49-49-77.5-114.5T120-440q0-74 28.5-139.5T226-694q49-49 114.5-77.5T480-800q62 0 119 20t107 58l56-56 56 56-56 56q38 50 58 107t20 119q0 74-28.5 139.5T734-186q-49 49-114.5 77.5T480-80Zm0-80q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm0-280Z"/></svg>`;

const GROUPS: Group[] = [
  {
    title: 'Stateful primitives',
    packages: [
      { name: '@studnicky/batch', link: '/packages/batch', desc: 'Batch concurrent execution for processing items in controlled parallel groups.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-400 40-640l440-240 440 240-440 240Zm0 160L63-467l84-46 333 182 333-182 84 46-417 227Zm0 160L63-307l84-46 333 182 333-182 84 46L480-80Zm0-411 273-149-273-149-273 149 273 149Zm0-149Z"/></svg>` },
      { name: '@studnicky/boundary-kit', link: '/packages/boundary-kit', desc: 'Composes throttle, resilience, and retry into a fixed-order boundary call pattern.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/></svg>` },
      { name: '@studnicky/bounded-dispatcher', link: '/packages/bounded-dispatcher', desc: "Composes concurrency's Semaphore, event-bus, and scheduler into a bounded work dispatch pattern.", icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M680-280q-72 0-127-45.5T484-440H272q-12 27-37 43.5T180-380q-42 0-71-29t-29-71q0-42 29-71t71-29q30 0 55 16.5t37 43.5h212q14-69 69-114.5T680-680q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280Zm0-80q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>` },
      { name: '@studnicky/cache', link: '/packages/cache', desc: 'In-process LRU cache with optional TTL and capacity eviction.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z"/></svg>` },
      { name: '@studnicky/circular-buffer', link: '/packages/circular-buffer', desc: 'Generic ring buffer with O(1) push and shift operations.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M441-82Q287-97 184-211T81-480q0-155 103-269t257-129v120q-104 14-172 93t-68 185q0 106 68 185t172 93v120Zm80 0v-120q94-12 159-78t79-160h120q-14 143-114.5 243.5T521-82Zm238-438q-14-94-79-160t-159-78v-120q143 14 243.5 114.5T879-520H759Z"/></svg>` },
      { name: '@studnicky/clock', link: '/packages/clock', desc: 'Wall-clock and monotonic time with injectable providers for deterministic testing.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/></svg>` },
      { name: '@studnicky/concurrency', link: '/packages/concurrency', desc: 'Async concurrency primitives: channels, semaphores, coalescing, and iterable utilities.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-80v-200q0-56-17-83t-45-53l57-57q12 11 23 23.5t22 26.5q14-19 28.5-33.5T538-485q38-35 69-81t33-161l-63 63-57-56 160-160 160 160-56 56-64-63q-2 143-44 203.5T592-425q-32 29-52 56.5T520-280v200h-80ZM248-633q-4-20-5.5-44t-2.5-50l-64 63-56-56 160-160 160 160-57 56-63-62q0 21 2 39.5t4 34.5l-78 19Zm86 176q-20-21-38.5-49T263-575l77-19q10 27 23 46t28 34l-57 57Z"/></svg>` },
      { name: '@studnicky/context', link: '/packages/context', desc: 'Per-request async context isolation using AsyncLocalStorage.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M120-80v-280h120v-160h200v-80H320v-280h320v280H520v80h200v160h120v280H520v-280h120v-80H320v80h120v280H120Zm280-600h160v-120H400v120ZM200-160h160v-120H200v120Zm400 0h160v-120H600v120ZM480-680ZM360-280Zm240 0Z"/></svg>` },
      { name: '@studnicky/entity-store', link: '/packages/entity-store', desc: 'Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M560-160v-80h120q17 0 28.5-11.5T720-280v-80q0-38 22-69t58-44v-14q-36-13-58-44t-22-69v-80q0-17-11.5-28.5T680-720H560v-80h120q50 0 85 35t35 85v80q0 17 11.5 28.5T840-560h40v160h-40q-17 0-28.5 11.5T800-360v80q0 50-35 85t-85 35H560Zm-280 0q-50 0-85-35t-35-85v-80q0-17-11.5-28.5T120-400H80v-160h40q17 0 28.5-11.5T160-600v-80q0-50 35-85t85-35h120v80H280q-17 0-28.5 11.5T240-680v80q0 38-22 69t-58 44v14q36 13 58 44t22 69v80q0 17 11.5 28.5T280-240h120v80H280Z"/></svg>` },
      { name: '@studnicky/event-bus', link: '/packages/event-bus', desc: 'Typed multi-topic pub/sub with per-subscriber backpressure queues.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-40q-50 0-85-35t-35-85q0-50 35-85t85-35q14 0 26 3t23 8l57-71q-28-31-39-70t-5-78l-81-27q-17 25-43 40t-58 15q-50 0-85-35T0-580q0-50 35-85t85-35q50 0 85 35t35 85v8l81 28q20-36 53.5-61t75.5-32v-87q-39-11-64.5-42.5T360-840q0-50 35-85t85-35q50 0 85 35t35 85q0 42-26 73.5T510-724v87q42 7 75.5 32t53.5 61l81-28v-8q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-32 0-58.5-15T739-515l-81 27q6 39-5 77.5T614-340l57 70q11-5 23-7.5t26-2.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-20 6.5-38.5T624-232l-57-71q-41 23-87.5 23T392-303l-56 71q11 15 17.5 33.5T360-160q0 50-35 85t-85 35ZM120-540q17 0 28.5-11.5T160-580q0-17-11.5-28.5T120-620q-17 0-28.5 11.5T80-580q0 17 11.5 28.5T120-540Zm120 420q17 0 28.5-11.5T280-160q0-17-11.5-28.5T240-200q-17 0-28.5 11.5T200-160q0 17 11.5 28.5T240-120Zm240-680q17 0 28.5-11.5T520-840q0-17-11.5-28.5T480-880q-17 0-28.5 11.5T440-840q0 17 11.5 28.5T480-800Zm0 440q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm240 240q17 0 28.5-11.5T760-160q0-17-11.5-28.5T720-200q-17 0-28.5 11.5T680-160q0 17 11.5 28.5T720-120Zm120-420q17 0 28.5-11.5T880-580q0-17-11.5-28.5T840-620q-17 0-28.5 11.5T800-580q0 17 11.5 28.5T840-540ZM480-840ZM120-580Zm360 120Zm360-120ZM240-160Zm480 0Z"/></svg>` },
      { name: '@studnicky/file-lock', link: '/packages/file-lock', desc: 'Process-level advisory file locking for CLI tools and daemons.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM490-80H240q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v52q-18-6-37.5-9t-42.5-3v-40H240v400h212q8 24 16 41.5T490-80Zm230 40q-83 0-141.5-58.5T520-240q0-83 58.5-141.5T720-440q83 0 141.5 58.5T920-240q0 83-58.5 141.5T720-40Zm66-106 28-28-74-74v-112h-40v128l86 86ZM240-560v400-400Z"/></svg>` },
      { name: '@studnicky/flag-evaluator', link: '/packages/flag-evaluator', desc: 'Local deterministic feature-flag evaluation with percentage rollout and observability hooks.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-120v-680h60v80h420l-60 140 60 140H300v320h-60Z"/></svg>` },
      { name: '@studnicky/fsm', link: '/packages/fsm', desc: 'Abstract finite state machine with async effect dispatch and singleton registry.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-40v-240h100v-80H160v-240h100v-80H160v-240h280v240H340v80h100v80h120v-80h280v240H560v-80H440v80H340v80h100v240H160Zm80-80h120v-80H240v80Zm0-320h120v-80H240v80Zm400 0h120v-80H640v80ZM240-760h120v-80H240v80Zm60-40Zm0 320Zm400 0ZM300-160Z"/></svg>` },
      { name: '@studnicky/health-registry', link: '/packages/health-registry', desc: 'Named async health-check registry with worst-status-wins aggregation.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/></svg>` },
      { name: '@studnicky/idempotency-guard', link: '/packages/idempotency-guard', desc: 'Idempotency key guard that dedupes concurrent calls, replays cached results within a TTL window, and rejects key reuse with a different payload.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z"/></svg>` },
      { name: '@studnicky/keyed-rate-limiter', link: '/packages/keyed-rate-limiter', desc: 'Per-key rate limiting that lazily creates one rate-limiting strategy per key, evicting idle keys via LRU+TTL.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M418-340q24 24 62 23.5t56-27.5l224-336-336 224q-27 18-28.5 55t22.5 61Zm62-460q59 0 113.5 16.5T696-734l-76 48q-33-17-68.5-25.5T480-720q-133 0-226.5 93.5T160-400q0 42 11.5 83t32.5 77h552q23-38 33.5-79t10.5-85q0-36-8.5-70T766-540l48-76q30 47 47.5 100T880-406q1 57-13 109t-41 99q-11 18-30 28t-40 10H204q-21 0-40-10t-30-28q-26-45-40-95.5T80-400q0-83 31.5-155.5t86-127Q252-737 325-768.5T480-800Zm7 313Z"/></svg>` },
      { name: '@studnicky/keyed-work-gate', link: '/packages/keyed-work-gate', desc: "Keyed single-flight and serialized work gate composing mutex and concurrency's Coalesce.", icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>` },
      { name: '@studnicky/logger', link: '/packages/logger', desc: 'Pluggable logging with transport architecture, child loggers, and structured builders.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-80q-50 0-85-35t-35-85v-120h120v-560l60 60 60-60 60 60 60-60 60 60 60-60 60 60 60-60 60 60v680q0 50-35 85t-85 35H240Zm480-80q17 0 28.5-11.5T760-200v-560H320v440h360v120q0 17 11.5 28.5T720-160ZM360-600v-80h240v80H360Zm0 120v-80h240v80H360Zm320-120q-17 0-28.5-11.5T640-640q0-17 11.5-28.5T680-680q17 0 28.5 11.5T720-640q0 17-11.5 28.5T680-600Zm0 120q-17 0-28.5-11.5T640-520q0-17 11.5-28.5T680-560q17 0 28.5 11.5T720-520q0 17-11.5 28.5T680-480ZM240-160h360v-80H200v40q0 17 11.5 28.5T240-160Zm-40 0v-80 80Z"/></svg>` },
      { name: '@studnicky/memoize', link: '/packages/memoize', desc: 'Pure function memoization with LRU+TTL result caching keyed by a caller-supplied key derivation, and in-flight call dedup.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z"/></svg>` },
      { name: '@studnicky/mutex', link: '/packages/mutex', desc: 'Key-based async mutual exclusion with queue and timeout support.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>` },
      { name: '@studnicky/paginator', link: '/packages/paginator', desc: 'Cursor/page-list state tracker for paginated data sources.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Zm40-80h200v-80H200v80Zm382-80 198-198-57-57-141 142-57-57-56 57 113 113Zm-382-80h200v-80H200v80Zm0-160h200v-80H200v80Zm-40 400v-560 560Z"/></svg>` },
      { name: '@studnicky/pipeline', link: '/packages/pipeline', desc: 'Generic typed async pipeline for sequential context transforms.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M680-280q-72 0-127-45.5T484-440H272q-12 27-37 43.5T180-380q-42 0-71-29t-29-71q0-42 29-71t71-29q30 0 55 16.5t37 43.5h212q14-69 69-114.5T680-680q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280Zm0-80q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>` },
      { name: '@studnicky/process-kit', link: '/packages/process-kit', desc: 'Reducer-with-effects process pattern composing fsm, scheduler, and signal.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M680-280q-72 0-127-45.5T484-440H272q-12 27-37 43.5T180-380q-42 0-71-29t-29-71q0-42 29-71t71-29q30 0 55 16.5t37 43.5h212q14-69 69-114.5T680-680q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280Zm0-80q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>` },
      { name: '@studnicky/request-executor', link: '/packages/request-executor', desc: 'One-shot request execution pattern composing fetch, retry, signal, timing, and context.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q17-72 85-137t145-65q33 0 56.5 23.5T520-716v242l64-62 56 56-160 160-160-160 56-56 64 62v-242q-76 14-118 73.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h480q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-48-22-89.5T600-680v-93q74 35 117 103.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H260Zm220-358Z"/></svg>` },
      { name: '@studnicky/resilience', link: '/packages/resilience', desc: 'Composable resilience primitives: circuit breaker, token bucket, and dead-letter queue.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/></svg>` },
      { name: '@studnicky/retry', link: '/packages/retry', desc: 'Generic async retry with extensible error classification and backoff strategies.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M204-318q-22-38-33-78t-11-82q0-134 93-228t227-94h7l-64-64 56-56 160 160-160 160-56-56 64-64h-7q-100 0-170 70.5T240-478q0 26 6 51t18 49l-60 60ZM481-40 321-200l160-160 56 56-64 64h7q100 0 170-70.5T720-482q0-26-6-51t-18-49l60-60q22 38 33 78t11 82q0 134-93 228t-227 94h-7l64 64-56 56Z"/></svg>` },
      { name: '@studnicky/sample-buffer', link: '/packages/sample-buffer', desc: 'Fixed-capacity numeric sample buffer with percentile calculation.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z"/></svg>` },
      { name: '@studnicky/scheduler', link: '/packages/scheduler', desc: 'Real-time and virtual scheduler primitives for deterministic testing.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M360-840v-80h240v80H360Zm80 440h80v-240h-80v240Zm40 320q-74 0-139.5-28.5T226-186q-49-49-77.5-114.5T120-440q0-74 28.5-139.5T226-694q49-49 114.5-77.5T480-800q62 0 119 20t107 58l56-56 56 56-56 56q38 50 58 107t20 119q0 74-28.5 139.5T734-186q-49 49-114.5 77.5T480-80Zm0-80q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm0-280Z"/></svg>` },
      { name: '@studnicky/sliding-window-limiter', link: '/packages/sliding-window-limiter', desc: 'Sliding-window rate limiter using an exact timestamp-log or approximate blended-counter algorithm.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M418-340q24 24 62 23.5t56-27.5l224-336-336 224q-27 18-28.5 55t22.5 61Zm62-460q59 0 113.5 16.5T696-734l-76 48q-33-17-68.5-25.5T480-720q-133 0-226.5 93.5T160-400q0 42 11.5 83t32.5 77h552q23-38 33.5-79t10.5-85q0-36-8.5-70T766-540l48-76q30 47 47.5 100T880-406q1 57-13 109t-41 99q-11 18-30 28t-40 10H204q-21 0-40-10t-30-28q-26-45-40-95.5T80-400q0-83 31.5-155.5t86-127Q252-737 325-768.5T480-800Zm7 313Z"/></svg>` },
      { name: '@studnicky/throttle', link: '/packages/throttle', desc: 'Sliding-window concurrency throttle with adaptive limits and abort support.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M418-340q24 24 62 23.5t56-27.5l224-336-336 224q-27 18-28.5 55t22.5 61Zm62-460q59 0 113.5 16.5T696-734l-76 48q-33-17-68.5-25.5T480-720q-133 0-226.5 93.5T160-400q0 42 11.5 83t32.5 77h552q23-38 33.5-79t10.5-85q0-36-8.5-70T766-540l48-76q30 47 47.5 100T880-406q1 57-13 109t-41 99q-11 18-30 28t-40 10H204q-21 0-40-10t-30-28q-26-45-40-95.5T80-400q0-83 31.5-155.5t86-127Q252-737 325-768.5T480-800Zm7 313Z"/></svg>` },
      { name: '@studnicky/timing', link: '/packages/timing', desc: 'High-resolution operation timing tracker using process.hrtime.bigint().', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-240q100 0 170-70t70-170q0-100-70-170t-170-70v240L310-310q35 33 78.5 51.5T480-240Zm0 160q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>` },
      { name: '@studnicky/visible-range', link: '/packages/visible-range', desc: 'Pure index/offset arithmetic for computing the visible item range of a virtualized list.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-160v-640h640v640H160Zm80-80h480v-480H240v480Zm80-80h320v-80H320v80Z"/></svg>` },
      { name: '@studnicky/worker-pool', link: '/packages/worker-pool', desc: 'Bounded worker_threads pool that fans work items across workers with a typed message envelope and per-task timeout.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-80v-200q0-56-17-83t-45-53l57-57q12 11 23 23.5t22 26.5q14-19 28.5-33.5T538-485q38-35 69-81t33-161l-63 63-57-56 160-160 160 160-56 56-64-63q-2 143-44 203.5T592-425q-32 29-52 56.5T520-280v200h-80ZM248-633q-4-20-5.5-44t-2.5-50l-64 63-56-56 160-160 160 160-57 56-63-62q0 21 2 39.5t4 34.5l-78 19Zm86 176q-20-21-38.5-49T263-575l77-19q10 27 23 46t28 34l-57 57Z"/></svg>` },
    ],
  },
  {
    title: 'Stateless utilities',
    packages: [
      { name: '@studnicky/config', link: '/packages/config', desc: 'Configuration validation utilities and type guards.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg>` },
      { name: '@studnicky/errors', link: '/packages/errors', desc: 'Standardized error hierarchy with cause-chain serialization and error codes.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>` },
      { name: '@studnicky/eslint-config', link: '/packages/eslint-config', desc: 'Shared ESLint flat config with custom structural and V8-performance rules.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m576-160-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104 104 104-56 56-104-104-104 104Zm79-360L513-662l56-56 85 85 170-170 56 57-225 226ZM80-280v-80h360v80H80Zm0-320v-80h360v80H80Z"/></svg>` },
      { name: '@studnicky/fetch', link: '/packages/fetch', desc: 'HTTP client with timeout, override hooks, and configured clients.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q17-72 85-137t145-65q33 0 56.5 23.5T520-716v242l64-62 56 56-160 160-160-160 56-56 64 62v-242q-76 14-118 73.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h480q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-48-22-89.5T600-680v-93q74 35 117 103.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H260Zm220-358Z"/></svg>` },
      { name: '@studnicky/json', link: '/packages/json', desc: 'JSON and object utilities: deep merge, clone, equality, freeze, patch, hash, and path access.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M560-160v-80h120q17 0 28.5-11.5T720-280v-80q0-38 22-69t58-44v-14q-36-13-58-44t-22-69v-80q0-17-11.5-28.5T680-720H560v-80h120q50 0 85 35t35 85v80q0 17 11.5 28.5T840-560h40v160h-40q-17 0-28.5 11.5T800-360v80q0 50-35 85t-85 35H560Zm-280 0q-50 0-85-35t-35-85v-80q0-17-11.5-28.5T120-400H80v-160h40q17 0 28.5-11.5T160-600v-80q0-50 35-85t85-35h120v80H280q-17 0-28.5 11.5T240-680v80q0 38-22 69t-58 44v14q36 13 58 44t22 69v80q0 17 11.5 28.5T280-240h120v80H280Z"/></svg>` },
      { name: '@studnicky/predicates', link: '/packages/predicates', desc: 'Static predicate library for JSON Schema draft 2020-12 validation.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Zm40-80h200v-80H200v80Zm382-80 198-198-57-57-141 142-57-57-56 57 113 113Zm-382-80h200v-80H200v80Zm0-160h200v-80H200v80Zm-40 400v-560 560Z"/></svg>` },
      { name: '@studnicky/signal', link: '/packages/signal', desc: 'AbortSignal composition helpers for deadline, caller signal, and sentinel.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M197-197q-54-55-85.5-127.5T80-480q0-84 31.5-156.5T197-763l57 57q-44 44-69 102t-25 124q0 67 25 125t69 101l-57 57Zm113-113q-32-33-51-76.5T240-480q0-51 19-94.5t51-75.5l57 57q-22 22-34.5 51T320-480q0 33 12.5 62t34.5 51l-57 57Zm170-90q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm170 90-57-57q22-22 34.5-51t12.5-62q0-33-12.5-62T593-593l57-57q32 32 51 75.5t19 94.5q0 50-19 93.5T650-310Zm113 113-57-57q44-44 69-102t25-124q0-67-25-125t-69-101l57-57q54 54 85.5 126.5T880-480q0 83-31.5 155.5T763-197Z"/></svg>` },
      { name: '@studnicky/system', link: '/packages/system', desc: 'CPU, GPU, memory, and platform introspection for Node.js processes.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/></svg>` },
      { name: '@studnicky/types', link: '/packages/types', desc: 'Shared zero-runtime utility types and type-guard helpers.', icon: `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m260-520 220-360 220 360H260ZM700-80q-75 0-127.5-52.5T520-260q0-75 52.5-127.5T700-440q75 0 127.5 52.5T880-260q0 75-52.5 127.5T700-80Zm-580-20v-320h320v320H120Zm580-60q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm-500-20h160v-160H200v160Zm202-420h156l-78-126-78 126Zm78 0ZM360-340Zm340 80Z"/></svg>` },
    ],
  },
  {
    title: 'ESLint Plugins',
    subgroups: [
      {
        title: 'Configuration rules',
        packages: [
          { name: '@studnicky/all-types-are-entities', link: '/eslint/rules/all-types-are-entities', desc: 'Disallows free-standing type aliases outside entity namespaces.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/constants-folder-required', link: '/eslint/rules/constants-folder-required', desc: 'Requires files with more than one top-level const declaration to live under a constants/ folder.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/entity-namespace', link: '/eslint/rules/entity-namespace', desc: 'Entity files must export a namespace with Schema as const, type Type derived via FromSchema, and a validate type guard.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/interface-must-be-contract', link: '/eslint/rules/interface-must-be-contract', desc: 'Interfaces express runtime contracts. Pure data shapes — every member JSON-serializable — must be schema-derived type aliases.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/interface-suffix', link: '/eslint/rules/interface-suffix', desc: "Requires every interface declaration's name to end with 'Interface'.", icon: ICON_CONFIG_RULE },
          { name: '@studnicky/interfaces-compose-named-types', link: '/eslint/rules/interfaces-compose-named-types', desc: 'Disallows inline object-literal types inside interface bodies.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-bind-apply-call', link: '/eslint/rules/no-bind-apply-call', desc: 'Disallows .bind(), .call(), and .apply() on callable receivers.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-export-alias', link: '/eslint/rules/no-export-alias', desc: 'Disallows aliased exports and any non-index re-export path.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-freestanding-verb-noun', link: '/eslint/rules/no-freestanding-verb-noun', desc: 'Disallows freestanding verbNoun functions at module scope.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-prefer-existing-type', link: '/eslint/rules/no-prefer-existing-type', desc: 'Disallows locally declared object types that duplicate or are subsumed by an imported type.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-project-internal-acronyms', link: '/eslint/rules/no-project-internal-acronyms', desc: 'Disallows internal shorthand identifiers (cb, dlq, cfg, opts, ctx, idx, etc.) in favour of descriptive names.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-readonly-in-data-type', link: '/eslint/rules/no-readonly-in-data-type', desc: 'Forbids readonly modifiers baked into exported type alias data definitions. Detection is type-checker driven; consumers declare immutability at the use site.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-suppression-comments', link: '/eslint/rules/no-suppression-comments', desc: 'Disallows all lint and type suppression comments.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-this-alias', link: '/eslint/rules/no-this-alias', desc: 'Disallows assigning this to a variable or binding it via assignment.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-trivial-shim', link: '/eslint/rules/no-trivial-shim', desc: 'Disallows wrapper functions that only forward or delegate a value without adding logic.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-type-aliasing', link: '/eslint/rules/no-type-aliasing', desc: 'Disallows naked type re-aliases, generic forwarding shims, and import aliases that hide canonical names.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/no-underscore-private', link: '/eslint/rules/no-underscore-private', desc: 'Disallows underscore-prefixed class members; use real #private fields/methods instead.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/prefer-collection-types', link: '/eslint/rules/prefer-collection-types', desc: 'Prefers Set/Map over arrays and POJOs for membership tests and keyed lookups.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/require-options-object', link: '/eslint/rules/require-options-object', desc: 'Requires functions with two or more optional parameters to collect them into a trailing options object.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/single-export', link: '/eslint/rules/single-export', desc: 'Requires each non-index file to export exactly one named symbol matching the filename, except for exempt directories and constrained enum files.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/type-alias-must-end-type', link: '/eslint/rules/type-alias-must-end-type', desc: 'Requires exported type aliases to end in Type.', icon: ICON_CONFIG_RULE },
          { name: '@studnicky/types-derived-from-schema', link: '/eslint/rules/types-derived-from-schema', desc: 'Disallows inline object-literal type aliases; requires data shapes to be derived from JSON Schema.', icon: ICON_CONFIG_RULE },
        ],
      },
      {
        title: 'V8 performance rules',
        packages: [
          { name: '@studnicky/v8/arguments-object', link: '/eslint/rules/v8/arguments-object', desc: 'Disallows the arguments object in functions.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/array-from-iterators', link: '/eslint/rules/v8/array-from-iterators', desc: 'Disallows Array.from on non-array iterators in hot paths.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/array-from-map-callback', link: '/eslint/rules/v8/array-from-map-callback', desc: 'Disallows the two-argument Array.from(iterable, mapFn) form.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/computed-class-properties', link: '/eslint/rules/v8/computed-class-properties', desc: 'Disallows computed property keys in class bodies.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/computed-object-properties', link: '/eslint/rules/v8/computed-object-properties', desc: 'Disallows computed property keys in object literals.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/conditional-property-assignment', link: '/eslint/rules/v8/conditional-property-assignment', desc: 'Disallows conditional this-property assignment inside a constructor.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/define-property', link: '/eslint/rules/v8/define-property', desc: 'Disallows Object.defineProperty.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/delete-property', link: '/eslint/rules/v8/delete-property', desc: 'Disallows the delete operator on object properties.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/dynamic-property-access', link: '/eslint/rules/v8/dynamic-property-access', desc: 'Disallows computed member access inside an object literal.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/eval-function', link: '/eslint/rules/v8/eval-function', desc: 'Disallows eval().', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/for-in-loops', link: '/eslint/rules/v8/for-in-loops', desc: 'Disallows for...in loops.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/for-of-arrays', link: '/eslint/rules/v8/for-of-arrays', desc: 'Disallows for...of over arrays; prefer index loops.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/inline-arrow-functions', link: '/eslint/rules/v8/inline-arrow-functions', desc: 'Disallows inline multi-statement arrow functions in a dispatch map rebuilt on every call.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/inline-functions', link: '/eslint/rules/v8/inline-functions', desc: 'Disallows inline function expressions in a dispatch map rebuilt on every call.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/max-switch-cases', link: '/eslint/rules/v8/max-switch-cases', desc: 'Requires a dispatch map once a switch statement reaches 20 non-default cases.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/memoize-array-length', link: '/eslint/rules/v8/memoize-array-length', desc: 'Disallows re-reading array.length in a for-loop test on every iteration.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/no-concat-in-loops', link: '/eslint/rules/v8/no-concat-in-loops', desc: 'Disallows Array.concat inside for loops.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/no-spread-in-loops', link: '/eslint/rules/v8/no-spread-in-loops', desc: 'Disallows array spread assignments inside for loops.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/object-spread', link: '/eslint/rules/v8/object-spread', desc: 'Disallows object spread inside a constructor.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/prototype-modification', link: '/eslint/rules/v8/prototype-modification', desc: 'Disallows assigning to .prototype after class definition.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/regexp-in-loops', link: '/eslint/rules/v8/regexp-in-loops', desc: 'Disallows RegExp construction inside loop bodies.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/switch-statements', link: '/eslint/rules/v8/switch-statements', desc: 'Disallows block statement bodies in switch cases.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/try-catch-in-loops', link: '/eslint/rules/v8/try-catch-in-loops', desc: 'Disallows try-catch blocks inside loop bodies.', icon: ICON_V8_RULE },
          { name: '@studnicky/v8/with-statement', link: '/eslint/rules/v8/with-statement', desc: 'Disallows with statements.', icon: ICON_V8_RULE },
        ],
      },
    ],
  },
];
</script>

<template>
  <div class="substrate-grid">
    <section v-for="group in GROUPS" :key="group.title" class="substrate-grid-section">
      <h2 class="substrate-grid-title">{{ group.title }}</h2>
      <template v-if="group.packages">
        <div class="substrate-grid-items">
          <a
            v-for="pkg in group.packages"
            :key="pkg.name"
            class="substrate-card"
            :href="withBase(pkg.link)"
          >
            <span class="substrate-card-icon" v-html="pkg.icon" aria-hidden="true"></span>
            <span class="substrate-card-name">{{ pkg.name }}</span>
            <span class="substrate-card-desc">{{ pkg.desc }}</span>
          </a>
        </div>
      </template>
      <template v-else-if="group.subgroups">
        <div v-for="subgroup in group.subgroups" :key="subgroup.title" class="substrate-grid-subsection">
          <h3 class="substrate-grid-subtitle">{{ subgroup.title }}</h3>
          <div class="substrate-grid-items">
            <a
              v-for="pkg in subgroup.packages"
              :key="pkg.name"
              class="substrate-card"
              :href="withBase(pkg.link)"
            >
              <span class="substrate-card-icon" v-html="pkg.icon" aria-hidden="true"></span>
              <span class="substrate-card-name">{{ pkg.name }}</span>
              <span class="substrate-card-desc">{{ pkg.desc }}</span>
            </a>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.substrate-grid {
  margin: 0 auto;
  max-width: 1152px;
  padding: 0 24px;
}
.substrate-grid-section {
  margin-top: 3rem;
}
.substrate-grid-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  border: none;
  margin: 0 0 1.1rem;
  padding: 0;
}
.substrate-grid-subsection {
  margin-top: 1.5rem;
}
.substrate-grid-subsection:first-of-type {
  margin-top: 0;
}
.substrate-grid-subtitle {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  border: none;
  margin: 0 0 0.9rem;
  padding: 0;
}
.substrate-grid-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.substrate-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  font-weight: inherit;
  transition: border-color 0.25s, background-color 0.25s, transform 0.25s;
}
.substrate-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}
.substrate-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.substrate-card-icon :deep(svg) {
  width: 26px;
  height: 26px;
  fill: currentColor;
}
.substrate-card-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 6px;
}
.substrate-card-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
</style>
